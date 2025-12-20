import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_accounts():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    accounts = [
        {
            'id': str(uuid.uuid4()),
            'name': 'Factory',
            'email': 'factory@leadtrack.com',
            'hashed_password': pwd_context.hash('0786'),
            'created_at': '2024-01-01T00:00:00'
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'TT',
            'email': 'tt@leadtrack.com',
            'hashed_password': pwd_context.hash('9786'),
            'created_at': '2024-01-01T00:00:00'
        }
    ]
    
    for account in accounts:
        existing = await db.users.find_one({'email': account['email']}, {'_id': 0})
        if not existing:
            await db.users.insert_one(account)
            print(f"✓ Created account: {account['name']} ({account['email']})")
        else:
            print(f"✓ Account already exists: {account['name']}")
    
    client.close()
    print("\n✓ Account initialization complete!")

if __name__ == "__main__":
    asyncio.run(init_accounts())
