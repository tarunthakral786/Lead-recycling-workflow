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

class RefiningBatch(BaseModel):
    lead_ingot_kg: float
    lead_ingot_pieces: int
    lead_ingot_image: str
    initial_dross_kg: float
    initial_dross_image: str
    dross_2nd_kg: float
    dross_2nd_image: str
    dross_3rd_kg: float
    dross_3rd_image: str
    pure_lead_kg: float
    pure_lead_image: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RefiningEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    entry_type: str = "refining"
    batches: List[RefiningBatch]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecyclingBatch(BaseModel):
    battery_type: str  # "PP" or "MC/SMF"
    battery_kg: float
    battery_image: str
    quantity_received: float  # Actual quantity received after recycling
    remelted_lead_kg: float  # Auto-calculated
    receivable_kg: float  # Auto-calculated (remelted - received)
    recovery_percent: float  # Auto-calculated
    remelted_lead_image: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecyclingEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    entry_type: str = "recycling"
    batches: List[RecyclingBatch]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    party_name: str
    quantity_kg: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    party_name: str
    quantity_kg: float

class SummaryStats(BaseModel):
    total_pure_lead_manufactured: float
    total_remelted_lead: float
    total_sold: float
    available_stock: float
    total_receivable: float  # TT only - scrap battery receivable

# Routes
@api_router.get("/")
async def root():
    return {"message": "LeadTrack Pro API"}

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
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

@api_router.post("/refining/entries")
async def create_refining_entry(
    batches_data: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    import json
    batches_json = json.loads(batches_data)
    
    # Process images
    file_idx = 0
    batches = []
    
    for batch_data in batches_json:
        batch = RefiningBatch(
            lead_ingot_kg=batch_data['lead_ingot_kg'],
            lead_ingot_pieces=batch_data['lead_ingot_pieces'],
            lead_ingot_image=base64.b64encode(await files[file_idx].read()).decode('utf-8'),
            initial_dross_kg=batch_data['initial_dross_kg'],
            initial_dross_image=base64.b64encode(await files[file_idx + 1].read()).decode('utf-8'),
            dross_2nd_kg=batch_data['dross_2nd_kg'],
            dross_2nd_image=base64.b64encode(await files[file_idx + 2].read()).decode('utf-8'),
            dross_3rd_kg=batch_data['dross_3rd_kg'],
            dross_3rd_image=base64.b64encode(await files[file_idx + 3].read()).decode('utf-8'),
            pure_lead_kg=batch_data['pure_lead_kg'],
            pure_lead_image=base64.b64encode(await files[file_idx + 4].read()).decode('utf-8')
        )
        batches.append(batch)
        file_idx += 5
    
    entry = RefiningEntry(
        user_id=current_user["id"],
        user_name=current_user["name"],
        batches=batches
    )
    
    doc = entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    for batch in doc['batches']:
        batch['timestamp'] = batch['timestamp'].isoformat()
    
    await db.entries.insert_one(doc)
    return {"id": entry.id, "message": "Refining entry created successfully"}

@api_router.post("/recycling/entries")
async def create_recycling_entry(
    batches_data: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    import json
    batches_json = json.loads(batches_data)
    
    file_idx = 0
    batches = []
    
    for batch_data in batches_json:
        # Auto-calculate remelted lead based on battery type
        battery_kg = batch_data['battery_kg']
        battery_type = batch_data['battery_type']
        quantity_received = batch_data.get('quantity_received', 0)
        has_output_image = batch_data.get('has_output_image', False)
        
        if battery_type == "PP":
            remelted_lead_kg = battery_kg * 0.605
        else:  # MC/SMF
            remelted_lead_kg = battery_kg * 0.58
        
        receivable_kg = remelted_lead_kg - quantity_received
        recovery_percent = (quantity_received / battery_kg * 100) if battery_kg > 0 else 0
        
        # Read battery input image
        battery_image = base64.b64encode(await files[file_idx].read()).decode('utf-8')
        file_idx += 1
        
        # Read output image if it exists, otherwise use empty string
        if has_output_image:
            remelted_lead_image = base64.b64encode(await files[file_idx].read()).decode('utf-8')
            file_idx += 1
        else:
            remelted_lead_image = ""
        
        batch = RecyclingBatch(
            battery_type=battery_type,
            battery_kg=battery_kg,
            battery_image=battery_image,
            quantity_received=quantity_received,
            remelted_lead_kg=round(remelted_lead_kg, 2),
            receivable_kg=round(receivable_kg, 2),
            recovery_percent=round(recovery_percent, 2),
            remelted_lead_image=remelted_lead_image
        )
        batches.append(batch)
    
    entry = RecyclingEntry(
        user_id=current_user["id"],
        user_name=current_user["name"],
        batches=batches
    )
    
    doc = entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    for batch in doc['batches']:
        batch['timestamp'] = batch['timestamp'].isoformat()
    
    await db.entries.insert_one(doc)
    return {"id": entry.id, "message": "Recycling entry created successfully"}

@api_router.get("/entries")
async def get_entries(current_user: dict = Depends(get_current_user)):
    entries = await db.entries.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    for entry in entries:
        if isinstance(entry['timestamp'], str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
        
        # Remove images from batch data for list view
        for batch in entry.get('batches', []):
            if isinstance(batch.get('timestamp'), str):
                batch['timestamp'] = datetime.fromisoformat(batch['timestamp'])
            batch.pop('lead_ingot_image', None)
            batch.pop('initial_dross_image', None)
            batch.pop('dross_2nd_image', None)
            batch.pop('dross_3rd_image', None)
            batch.pop('pure_lead_image', None)
            batch.pop('battery_image', None)
            batch.pop('remelted_lead_image', None)
    
    return entries

@api_router.get("/entries/{entry_id}")
async def get_entry_detail(entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if isinstance(entry['timestamp'], str):
        entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    for batch in entry.get('batches', []):
        if isinstance(batch.get('timestamp'), str):
            batch['timestamp'] = datetime.fromisoformat(batch['timestamp'])
    
    return entry

@api_router.post("/sales", response_model=SaleEntry)
async def create_sale(
    sale_data: SaleCreate,
    current_user: dict = Depends(get_current_user)
):
    sale = SaleEntry(
        user_id=current_user["id"],
        user_name=current_user["name"],
        party_name=sale_data.party_name,
        quantity_kg=sale_data.quantity_kg
    )
    
    doc = sale.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.sales.insert_one(doc)
    
    return sale

@api_router.get("/sales")
async def get_sales(current_user: dict = Depends(get_current_user)):
    sales = await db.sales.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    for sale in sales:
        if isinstance(sale['timestamp'], str):
            sale['timestamp'] = datetime.fromisoformat(sale['timestamp'])
    
    return sales

@api_router.get("/summary", response_model=SummaryStats)
async def get_summary(current_user: dict = Depends(get_current_user)):
    # Calculate total pure lead from refining
    refining_entries = await db.entries.find({"entry_type": "refining"}, {"_id": 0}).to_list(10000)
    total_pure_lead = sum(
        batch['pure_lead_kg']
        for entry in refining_entries
        for batch in entry.get('batches', [])
    )
    
    # Calculate total remelted lead from recycling (actual quantity received)
    recycling_entries = await db.entries.find({"entry_type": "recycling"}, {"_id": 0}).to_list(10000)
    total_remelted_lead = sum(
        batch.get('quantity_received', 0)  # Use actual received quantity
        for entry in recycling_entries
        for batch in entry.get('batches', [])
    )
    
    # Calculate total receivable (expected - received)
    total_receivable = sum(
        batch.get('receivable_kg', 0)
        for entry in recycling_entries
        for batch in entry.get('batches', [])
    )
    
    # Calculate total sold
    sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    total_sold = sum(sale['quantity_kg'] for sale in sales)
    
    # Calculate available stock (pure lead + actual remelted - sold)
    available_stock = total_pure_lead + total_remelted_lead - total_sold
    
    return SummaryStats(
        total_pure_lead_manufactured=round(total_pure_lead, 2),
        total_remelted_lead=round(total_remelted_lead, 2),
        total_sold=round(total_sold, 2),
        available_stock=round(available_stock, 2),
        total_receivable=round(total_receivable, 2)
    )

@api_router.get("/entries/export/excel")
async def export_entries_excel(current_user: dict = Depends(get_current_user)):
    entries = await db.entries.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    
    wb = Workbook()
    
    # Refining Sheet
    ws_refining = wb.active
    ws_refining.title = "Refining"
    
    headers_refining = [
        "Date", "Time", "Employee", "Batch #",
        "Lead Ingot (kg)", "Pieces",
        "Initial Dross (kg)", "2nd Dross (kg)", "3rd Dross (kg)",
        "Pure Lead Output (kg)"
    ]
    
    header_fill = PatternFill(start_color="EA580C", end_color="EA580C", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    
    for col_num, header in enumerate(headers_refining, 1):
        cell = ws_refining.cell(row=1, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    row_num = 2
    for entry in entries:
        if entry.get('entry_type') == 'refining':
            timestamp = entry['timestamp']
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            for batch_idx, batch in enumerate(entry.get('batches', []), 1):
                ws_refining.cell(row=row_num, column=1, value=timestamp.strftime("%Y-%m-%d"))
                ws_refining.cell(row=row_num, column=2, value=timestamp.strftime("%H:%M:%S"))
                ws_refining.cell(row=row_num, column=3, value=entry['user_name'])
                ws_refining.cell(row=row_num, column=4, value=f"Batch {batch_idx}")
                ws_refining.cell(row=row_num, column=5, value=batch['lead_ingot_kg'])
                ws_refining.cell(row=row_num, column=6, value=batch['lead_ingot_pieces'])
                ws_refining.cell(row=row_num, column=7, value=batch['initial_dross_kg'])
                ws_refining.cell(row=row_num, column=8, value=batch['dross_2nd_kg'])
                ws_refining.cell(row=row_num, column=9, value=batch['dross_3rd_kg'])
                ws_refining.cell(row=row_num, column=10, value=batch['pure_lead_kg'])
                row_num += 1
    
    # Recycling Sheet
    ws_recycling = wb.create_sheet("Recycling")
    headers_recycling = [
        "Date", "Time", "Employee", "Batch #",
        "Battery Type", "Battery Input (kg)", "Expected Output (kg)", 
        "Quantity Received (kg)", "Receivable (kg)", "Recovery %"
    ]
    
    for col_num, header in enumerate(headers_recycling, 1):
        cell = ws_recycling.cell(row=1, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    row_num = 2
    for entry in entries:
        if entry.get('entry_type') == 'recycling':
            timestamp = entry['timestamp']
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            for batch_idx, batch in enumerate(entry.get('batches', []), 1):
                ws_recycling.cell(row=row_num, column=1, value=timestamp.strftime("%Y-%m-%d"))
                ws_recycling.cell(row=row_num, column=2, value=timestamp.strftime("%H:%M:%S"))
                ws_recycling.cell(row=row_num, column=3, value=entry['user_name'])
                ws_recycling.cell(row=row_num, column=4, value=f"Batch {batch_idx}")
                ws_recycling.cell(row=row_num, column=5, value=batch['battery_type'])
                ws_recycling.cell(row=row_num, column=6, value=batch['battery_kg'])
                ws_recycling.cell(row=row_num, column=7, value=batch['remelted_lead_kg'])
                ws_recycling.cell(row=row_num, column=8, value=batch.get('quantity_received', 0))
                ws_recycling.cell(row=row_num, column=9, value=batch.get('receivable_kg', 0))
                ws_recycling.cell(row=row_num, column=10, value=batch.get('recovery_percent', 0))
                row_num += 1
    
    # Sales Sheet
    ws_sales = wb.create_sheet("Sales")
    headers_sales = ["Date", "Time", "Employee", "Party Name", "Quantity Sold (kg)"]
    
    for col_num, header in enumerate(headers_sales, 1):
        cell = ws_sales.cell(row=1, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    sales = await db.sales.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    for row_num, sale in enumerate(sales, 2):
        timestamp = sale['timestamp']
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        
        ws_sales.cell(row=row_num, column=1, value=timestamp.strftime("%Y-%m-%d"))
        ws_sales.cell(row=row_num, column=2, value=timestamp.strftime("%H:%M:%S"))
        ws_sales.cell(row=row_num, column=3, value=sale['user_name'])
        ws_sales.cell(row=row_num, column=4, value=sale['party_name'])
        ws_sales.cell(row=row_num, column=5, value=sale['quantity_kg'])
    
    # Auto-adjust column widths for all sheets
    for ws in [ws_refining, ws_recycling, ws_sales]:
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
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leadtrack_report.xlsx"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()