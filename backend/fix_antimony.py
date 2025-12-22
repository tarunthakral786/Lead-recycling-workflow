"""
Script to fix existing refining entries that used RML SKUs but didn't have SB percentage stored.
This will look up the SB percentage from the RML purchase and update the refining entry.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "leadtrack_db")

async def fix_refining_entries():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get all RML purchases to build a SKU -> SB% mapping
    rml_purchases = await db.rml_purchases.find({}, {"_id": 0}).to_list(10000)
    sku_to_sb = {}
    for entry in rml_purchases:
        for batch in entry.get('batches', []):
            sku = batch.get('sku', '')
            sb_percentage = batch.get('sb_percentage')
            if sku and sb_percentage:
                sku_to_sb[sku] = sb_percentage
    
    print(f"Found {len(sku_to_sb)} RML SKUs with SB percentages:")
    for sku, sb in sku_to_sb.items():
        print(f"  {sku}: {sb}%")
    
    # Get all refining entries
    refining_entries = await db.entries.find({"entry_type": "refining"}, {"_id": 0}).to_list(10000)
    
    updated_count = 0
    for entry in refining_entries:
        needs_update = False
        for batch in entry.get('batches', []):
            input_source = batch.get('input_source', 'manual')
            sb_percentage = batch.get('sb_percentage')
            
            # If it's an RML SKU (not manual, not SANTOSH) and no SB%, try to fill it
            if input_source not in ['manual', 'SANTOSH'] and sb_percentage is None:
                if input_source in sku_to_sb:
                    batch['sb_percentage'] = sku_to_sb[input_source]
                    needs_update = True
                    print(f"Updating entry {entry['id']}: Setting SB% to {sku_to_sb[input_source]} for {input_source}")
        
        if needs_update:
            await db.entries.update_one(
                {"id": entry['id']},
                {"$set": {"batches": entry['batches']}}
            )
            updated_count += 1
    
    print(f"\nUpdated {updated_count} refining entries")
    
    # Verify by checking summary calculation
    total_antimony = 0
    refining_entries = await db.entries.find({"entry_type": "refining"}, {"_id": 0}).to_list(10000)
    for entry in refining_entries:
        for batch in entry.get('batches', []):
            sb = batch.get('sb_percentage') or 0
            qty = batch.get('lead_ingot_kg', 0)
            if sb:
                antimony = sb * qty / 100
                total_antimony += antimony
                print(f"Entry {entry['id']}: {sb}% x {qty}kg = {antimony:.2f}kg antimony")
    
    print(f"\nTotal Antimony Recoverable: {total_antimony:.2f} kg")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_refining_entries())
