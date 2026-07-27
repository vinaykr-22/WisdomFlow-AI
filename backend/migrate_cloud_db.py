import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def run_migration():
    print(f"Starting database migration for: {os.getenv('DATABASE_URL')}")
    async with engine.begin() as conn:
        try:
            # We use a raw SQL command to alter the table
            await conn.execute(text("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255);"))
            print("Successfully added reset_password_token column.")
        except Exception as e:
            print(f"Note: Column reset_password_token may already exist. Error details: {str(e)[:100]}...")

        try:
            # Add the expiration datetime column
            await conn.execute(text("ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP WITH TIME ZONE;"))
            print("Successfully added reset_password_expires column.")
        except Exception as e:
            print(f"Note: Column reset_password_expires may already exist. Error details: {str(e)[:100]}...")

    print("Migration complete!")

if __name__ == "__main__":
    # Ensure this runs the async migration script properly
    asyncio.run(run_migration())
