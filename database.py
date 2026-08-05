import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import func

# Support both DATABASE_URL and MYSQL_URL (Railway's default variable)
_raw_url = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL", "")

if _raw_url:
    # Convert mysql:// to mysql+aiomysql:// for async support
    if _raw_url.startswith("mysql://"):
        DATABASE_URL = _raw_url.replace("mysql://", "mysql+aiomysql://", 1)
        if "charset=" not in DATABASE_URL:
            DATABASE_URL += "?charset=utf8"
    else:
        DATABASE_URL = _raw_url
else:
    DATABASE_URL = "mysql+aiomysql://root:123456@localhost:3306/bad_actors_engine?charset=utf8&connect_timeout=10"
engine = create_async_engine(
    DATABASE_URL,
    echo = True,
    pool_size = 10,
    max_overflow = 20,
)
Async_Session = async_sessionmaker(
    bind = engine,
    class_ = AsyncSession,
    expire_on_commit = False
)
async def get_db():
    async with Async_Session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
class Base(DeclarativeBase):
    create_time : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),comment = "create time")
    update_time : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),onupdate=func.now(),comment = "update time")