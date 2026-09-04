import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Cargar variables de entorno
load_dotenv()

# Tomar la URL de Neon PostgreSQL / SQLite
raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")

if not raw_db_url:
    raise ValueError("Falta DATABASE_URL en el entorno")

# Fix para URLs de PostgreSQL compatibles con SQLAlchemy (e.g. Neon o Render usan postgres://)
if raw_db_url.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    SQLALCHEMY_DATABASE_URL = raw_db_url

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Configuración específica para SQLite local y tests
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Configuración robusta para PostgreSQL (Neon Serverless):
    # pool_pre_ping evita desconexiones por suspensión de compute idle en Neon
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
