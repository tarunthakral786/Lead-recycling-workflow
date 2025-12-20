from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import base64
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Entry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    
    # Lead ingot inputs
    lead_ingot_kg: float
    lead_ingot_pieces: int
    lead_ingot_image: str  # base64
    
    # Dross inputs
    initial_dross_kg: float
    initial_dross_image: str
    dross_2nd_kg: float
    dross_2nd_image: str
    dross_3rd_kg: float
    dross_3rd_image: str
    
    # Final output
    pure_lead_kg: float
    pure_lead_image: str
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntryResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    lead_ingot_kg: float
    lead_ingot_pieces: int
    initial_dross_kg: float
    dross_2nd_kg: float
    dross_3rd_kg: float
    pure_lead_kg: float
    timestamp: datetime

# Routes
@api_router.get("/")
async def root():
    return {"message": "LeadTrack Pro API"}

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(id=user.id, name=user.name, email=user.email)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"])
    )

@api_router.post("/entries", response_model=EntryResponse)
async def create_entry(
    lead_ingot_kg: float = Form(...),
    lead_ingot_pieces: int = Form(...),
    lead_ingot_image: UploadFile = File(...),
    initial_dross_kg: float = Form(...),
    initial_dross_image: UploadFile = File(...),
    dross_2nd_kg: float = Form(...),
    dross_2nd_image: UploadFile = File(...),
    dross_3rd_kg: float = Form(...),
    dross_3rd_image: UploadFile = File(...),
    pure_lead_kg: float = Form(...),
    pure_lead_image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Convert images to base64
    lead_ingot_img_data = base64.b64encode(await lead_ingot_image.read()).decode('utf-8')
    initial_dross_img_data = base64.b64encode(await initial_dross_image.read()).decode('utf-8')
    dross_2nd_img_data = base64.b64encode(await dross_2nd_image.read()).decode('utf-8')
    dross_3rd_img_data = base64.b64encode(await dross_3rd_image.read()).decode('utf-8')
    pure_lead_img_data = base64.b64encode(await pure_lead_image.read()).decode('utf-8')
    
    entry = Entry(
        user_id=current_user["id"],
        user_name=current_user["name"],
        lead_ingot_kg=lead_ingot_kg,
        lead_ingot_pieces=lead_ingot_pieces,
        lead_ingot_image=lead_ingot_img_data,
        initial_dross_kg=initial_dross_kg,
        initial_dross_image=initial_dross_img_data,
        dross_2nd_kg=dross_2nd_kg,
        dross_2nd_image=dross_2nd_img_data,
        dross_3rd_kg=dross_3rd_kg,
        dross_3rd_image=dross_3rd_img_data,
        pure_lead_kg=pure_lead_kg,
        pure_lead_image=pure_lead_img_data
    )
    
    doc = entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.entries.insert_one(doc)
    
    return EntryResponse(
        id=entry.id,
        user_id=entry.user_id,
        user_name=entry.user_name,
        lead_ingot_kg=entry.lead_ingot_kg,
        lead_ingot_pieces=entry.lead_ingot_pieces,
        initial_dross_kg=entry.initial_dross_kg,
        dross_2nd_kg=entry.dross_2nd_kg,
        dross_3rd_kg=entry.dross_3rd_kg,
        pure_lead_kg=entry.pure_lead_kg,
        timestamp=entry.timestamp
    )

@api_router.get("/entries", response_model=List[EntryResponse])
async def get_entries(current_user: dict = Depends(get_current_user)):
    entries = await db.entries.find({}, {"_id": 0, "lead_ingot_image": 0, "initial_dross_image": 0, "dross_2nd_image": 0, "dross_3rd_image": 0, "pure_lead_image": 0}).sort("timestamp", -1).to_list(1000)
    
    for entry in entries:
        if isinstance(entry['timestamp'], str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    return entries

@api_router.get("/entries/{entry_id}")
async def get_entry_detail(entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if isinstance(entry['timestamp'], str):
        entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    return entry

@api_router.get("/entries/export/excel")
async def export_entries_excel(current_user: dict = Depends(get_current_user)):
    entries = await db.entries.find({}, {"_id": 0, "lead_ingot_image": 0, "initial_dross_image": 0, "dross_2nd_image": 0, "dross_3rd_image": 0, "pure_lead_image": 0}).sort("timestamp", -1).to_list(10000)
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Lead Entries"
    
    # Headers
    headers = [
        "Entry ID", "Timestamp", "Employee", 
        "Lead Ingot (kg)", "Lead Ingot (pieces)",
        "Initial Dross (kg)", "2nd Dross (kg)", "3rd Dross (kg)",
        "Pure Lead Output (kg)"
    ]
    
    # Style headers
    header_fill = PatternFill(start_color="EA580C", end_color="EA580C", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Data rows
    for row_num, entry in enumerate(entries, 2):
        timestamp = entry['timestamp']
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        
        ws.cell(row=row_num, column=1, value=entry['id'])
        ws.cell(row=row_num, column=2, value=timestamp.strftime("%Y-%m-%d %H:%M:%S"))
        ws.cell(row=row_num, column=3, value=entry['user_name'])
        ws.cell(row=row_num, column=4, value=entry['lead_ingot_kg'])
        ws.cell(row=row_num, column=5, value=entry['lead_ingot_pieces'])
        ws.cell(row=row_num, column=6, value=entry['initial_dross_kg'])
        ws.cell(row=row_num, column=7, value=entry['dross_2nd_kg'])
        ws.cell(row=row_num, column=8, value=entry['dross_3rd_kg'])
        ws.cell(row=row_num, column=9, value=entry['pure_lead_kg'])
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column = list(column)
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(cell.value)
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column[0].column_letter].width = adjusted_width
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=lead_entries.xlsx"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()