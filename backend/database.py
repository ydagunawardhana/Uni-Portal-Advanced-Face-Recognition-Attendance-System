from sqlalchemy import create_engine, text # type: ignore
from sqlalchemy.ext.declarative import declarative_base # type: ignore
from sqlalchemy.orm import sessionmaker # type: ignore
from config import DATABASE_URL

# Engine – connection pool tuned for local dev

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # verify connections before handing them out
    pool_size=5,          # keep up to 5 connections open
    max_overflow=10,      # allow up to 10 extra connections under load
    echo=False,           # set True to log all SQL statements
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Session dependency (use in route handlers)

def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Utility – verify the DB is reachable

def check_db_connection() -> bool:
    """Return True if the database is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
