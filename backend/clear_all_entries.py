#!/usr/bin/env python3
"""
Script to clear all entries from the database (except users and settings)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def clear_all_entries():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Clear all data collections
    collections_to_clear = [
        'entries',           # Refining and Recycling entries
        'dross_recycling_entries',  # HIGH LEAD recovery entries
        'rml_purchases',     # RML purchase entries
        'sales',             # Sales entries
    ]
    
    for collection_name in collections_to_clear:
        result = await db[collection_name].delete_many({})
        print(f"Cleared {collection_name}: {result.deleted_count} documents deleted")
    
    print("\nAll entries cleared successfully!")
    
    # Show summary
    summary = await db.command("dbstats")
    print(f"\nDatabase stats after clearing:")
    print(f"  Collections: {summary.get('collections', 0)}")
    print(f"  Objects: {summary.get('objects', 0)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_all_entries())
