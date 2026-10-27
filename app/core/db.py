import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    # El SQL en la terminal solo se muestra si definís SQL_ECHO=true en tu .env
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    pool_pre_ping=True,  # opcional: evita conexiones caídas en Render
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()