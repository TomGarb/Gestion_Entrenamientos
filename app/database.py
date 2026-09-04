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


def run_auto_migrations(target_engine=None):
    """
    Sincroniza dinámicamente columnas faltantes en tablas existentes sin requerir Alembic.
    Detecta si una columna definida en los modelos de SQLAlchemy no existe en la base de datos
    y ejecuta ALTER TABLE para agregarla de forma segura y retrocompatible.
    """
    eng = target_engine or engine
    try:
        from sqlalchemy import inspect, text

        inspector = inspect(eng)
        existing_tables = inspector.get_table_names()

        with eng.begin() as conn:
            for table_name, table in Base.metadata.tables.items():
                if table_name in existing_tables:
                    existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
                    for col in table.columns:
                        if col.name not in existing_columns:
                            col_type = col.type.compile(eng.dialect)
                            alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}'
                            conn.execute(text(alter_stmt))
                            print(f"[Auto-Migrate] Columna agregada exitosamente: {table_name}.{col.name} ({col_type})")
    except Exception as e:
        print(f"[Auto-Migrate] Aviso/Error durante sincronización de columnas: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

