import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def cleanup_users():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Keep only these users
    keep_emails = [
        'factory@leadtrack.com',
        'tt@leadtrack.com',
        'umesh@padmavatienergy.com'
    ]
    
    # Delete all users except the ones in keep list
    result = await db.users.delete_many({
        'email': {'$nin': keep_emails}
    })
    
    print(f"✓ Deleted {result.deleted_count} users")
    print(f"✓ Kept: TT, Factory, Umesh@padmavatienergy.com")
    
    # Show remaining users
    remaining = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    print(f"\n✓ Remaining users: {len(remaining)}")
    for u in remaining:
        print(f"  - {u['name']} ({u['email']})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_users())
