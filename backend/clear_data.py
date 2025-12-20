import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def clear_all_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    entries_result = await db.entries.delete_many({})
    print(f"✓ Deleted {entries_result.deleted_count} entries")
    
    sales_result = await db.sales.delete_many({})
    print(f"✓ Deleted {sales_result.deleted_count} sales")
    
    dross_result = await db.dross_recycling_entries.delete_many({})
    print(f"✓ Deleted {dross_result.deleted_count} dross recycling entries")
    
    client.close()
    print("\n✅ All data cleared!")

if __name__ == "__main__":
    asyncio.run(clear_all_data())