"""
Script de Inicialización y Migración de Base de Datos para GymTracker v3.0
Crea y sincroniza todas las tablas del esquema en PostgreSQL (Neon) o SQLite local.
"""

import sys
import os

# Forzar codificación UTF-8 para salida en consola
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Asegurar path de importación
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine, Base
from app.models import (
    User,
    Exercise,
    Routine,
    RoutineExercise,
    WorkoutLog,
    WorkoutSet,
    Feedback,
    Friendship,
    Notification,
    WorkoutGroup,
    GroupMember,
    ScheduledWorkout
)

def init_database():
    print("[INIT] Conectando a la base de datos...")
    print(f"[INIT] URL Configurada: {engine.url.render_as_string(hide_password=True)}")
    
    try:
        print("[INIT] Creando y verificando tablas del esquema v3.0...")
        Base.metadata.create_all(bind=engine)
        print("[OK] ¡Todas las tablas fueron creadas/verificadas exitosamente!")
        print("\nTablas activas en el esquema:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
    except Exception as e:
        print(f"[ERROR] Error conectando a la base de datos: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
