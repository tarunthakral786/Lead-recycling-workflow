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
    
    # Delete all entries (refining and recycling)
    entries_result = await db.entries.delete_many({})
    print(f"✓ Deleted {entries_result.deleted_count} entries (refining + recycling)")
    
    # Delete all sales
    sales_result = await db.sales.delete_many({})
    print(f"✓ Deleted {sales_result.deleted_count} sales records")
    
    client.close()
    print("\n✅ All data cleared successfully!")
    print("📊 All stocks are now at 0")

if __name__ == "__main__":
    asyncio.run(clear_all_data())
