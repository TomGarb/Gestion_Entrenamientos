import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker

# 1. Cargar variables de entorno del archivo .env
load_dotenv()

SQLITE_URL = "sqlite:///./app.db"
NEON_URL = os.getenv("DATABASE_URL")

if not NEON_URL or "usuario:password" in NEON_URL:
    print("⚠️  Por favor, reemplaza la DATABASE_URL genérica en tu archivo .env con tu conexión real de Neon.")
    sys.exit(1)

# 2. Configurar los motores (Engines)
print("🔗 Conectando a SQLite (Origen)...")
sqlite_engine = create_engine(SQLITE_URL)

print("🔗 Conectando a PostgreSQL (Destino)...")
pg_engine = create_engine(NEON_URL)

# 3. Importar modelos para que Base.metadata los reconozca
# Aseguramos que la ruta 'app' sea visible agregando la raíz al sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import Base
import app.models.user
import app.models.exercise
import app.models.routine
import app.models.workout

def migrar_datos():
    print("\n🚀 Iniciando Migración: SQLite -> Neon PostgreSQL")
    
    # 4. Crear las tablas en Neon
    print("\n[1/3] Creando estructura de tablas en Neon...")
    Base.metadata.create_all(pg_engine)
    
    # 5. Migrar tabla por tabla respetando dependencias (foreign keys)
    print("\n[2/3] Migrando datos tabla por tabla...")
    for table in Base.metadata.sorted_tables:
        print(f"  ⏳ Extrayendo {table.name}...")
        
        # Leer datos de SQLite
        with sqlite_engine.connect() as sqlite_conn:
            rows = sqlite_conn.execute(table.select()).mappings().all()
        
        if not rows:
            print(f"  ⏭️  La tabla '{table.name}' está vacía. Saltando.")
            continue
            
        # Insertar datos en PostgreSQL
        with pg_engine.begin() as pg_conn:
            # En PostgreSQL, si intentamos insertar con un ID explícito, lo acepta.
            # Convertimos las filas a diccionarios estándar
            data_to_insert = [dict(row) for row in rows]
            pg_conn.execute(table.insert(), data_to_insert)
            
        print(f"  ✅ {len(rows)} registros insertados en '{table.name}'.")
    
    # 6. Actualizar secuencias en PostgreSQL
    print("\n[3/3] Sincronizando secuencias de Auto-Incremento (Crucial)...")
    with pg_engine.begin() as pg_conn:
        for table in Base.metadata.sorted_tables:
            # Buscar columnas que sean primary key numéricas (id)
            pk_cols = [c for c in table.primary_key.columns]
            if len(pk_cols) == 1 and pk_cols[0].type.python_type == int:
                pk_name = pk_cols[0].name
                table_name = table.name
                try:
                    # En PostgreSQL: setval ajusta el contador interno (sequence) de la columna SERIAL/IDENTITY
                    sql = text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table_name}', '{pk_name}'), 
                            COALESCE((SELECT MAX({pk_name}) FROM {table_name}), 1), 
                            true
                        );
                    """)
                    pg_conn.execute(sql)
                    print(f"  ✅ Secuencia ajustada para {table_name}.{pk_name}")
                except Exception as e:
                    print(f"  ⚠️  No se pudo ajustar secuencia para {table_name}: {e}")

    print("\n🎉 ¡Migración completada exitosamente!")
    print("Recuerda actualizar tu app/database.py o las variables de entorno en producción para usar PostgreSQL.")

if __name__ == "__main__":
    migrar_datos()
