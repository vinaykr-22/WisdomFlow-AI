from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

from pathlib import Path

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Ensure parent directory exists for SQLite database file
if "sqlite" in db_url:
    try:
        path_str = db_url.split("///")[-1]
        if path_str and not path_str.startswith(":memory:"):
            Path(path_str).parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Warning: could not create database directory: {e}")

# Fix asyncpg sslmode issue
if "?sslmode=" in db_url:
    db_url = db_url.replace("?sslmode=", "?ssl=")
elif "&sslmode=" in db_url:
    db_url = db_url.replace("&sslmode=", "&ssl=")

engine = create_async_engine(db_url)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)



class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
