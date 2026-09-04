"""
Script para resetear la base de datos dejando intacto el catálogo de ejercicios y el Super Admin.
"""

import sys
import os

# Forzar codificación UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, engine
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

def reset_database():
    db = SessionLocal()
    print("[RESET] Iniciando reseteo controlado de la base de datos...")
    print(f"[RESET] Base de datos conectada: {engine.url.render_as_string(hide_password=True)}")

    try:
        # 1. Identificar Super Admin(s)
        admins = db.query(User).filter(User.is_admin == True).all()
        admin_ids = [a.id for a in admins]
        print(f"[RESET] Super Admins preservados ({len(admins)}):")
        for a in admins:
            print(f"  - ID: {a.id} | Username: @{a.username} | Email: {a.email}")

        if not admins:
            print("[WARN] No se encontró ningún usuario con is_admin=True. Abortando para evitar pérdida de acceso.")
            return

        # 2. Eliminar dependencias en orden
        print("\n[RESET] Eliminando datos de prueba...")

        num_sets = db.query(WorkoutSet).delete(synchronize_session=False)
        print(f"  - WorkoutSet eliminados: {num_sets}")

        num_logs = db.query(WorkoutLog).delete(synchronize_session=False)
        print(f"  - WorkoutLog eliminados: {num_logs}")

        num_sched = db.query(ScheduledWorkout).delete(synchronize_session=False)
        print(f"  - ScheduledWorkout (Calendario) eliminados: {num_sched}")

        num_group_members = db.query(GroupMember).delete(synchronize_session=False)
        print(f"  - GroupMember eliminados: {num_group_members}")

        num_groups = db.query(WorkoutGroup).delete(synchronize_session=False)
        print(f"  - WorkoutGroup eliminados: {num_groups}")

        num_friendships = db.query(Friendship).delete(synchronize_session=False)
        print(f"  - Friendship eliminados: {num_friendships}")

        num_notifs = db.query(Notification).delete(synchronize_session=False)
        print(f"  - Notification eliminadas: {num_notifs}")

        num_feedbacks = db.query(Feedback).delete(synchronize_session=False)
        print(f"  - Feedback eliminados: {num_feedbacks}")

        num_re = db.query(RoutineExercise).delete(synchronize_session=False)
        print(f"  - RoutineExercise eliminados: {num_re}")

        num_routines = db.query(Routine).delete(synchronize_session=False)
        print(f"  - Routine eliminadas: {num_routines}")

        # Ejercicios personalizados de usuarios eliminados (manteniendo catálogo general)
        num_custom_ex = db.query(Exercise).filter(
            (Exercise.is_custom == True) | (Exercise.user_id != None)
        ).delete(synchronize_session=False)
        print(f"  - Ejercicios personalizados eliminados: {num_custom_ex}")

        # Eliminar usuarios no administradores
        num_users = db.query(User).filter(User.is_admin == False).delete(synchronize_session=False)
        print(f"  - Usuarios de prueba eliminados: {num_users}")

        db.commit()
        print("\n[OK] ¡Base de datos reseteada con éxito!")

        # 3. Reporte de verificación final
        remaining_users = db.query(User).all()
        remaining_exercises = db.query(Exercise).all()

        print("\n" + "="*50)
        print("📊 REPORTE POST-RESETEO:")
        print("="*50)
        print(f"Usuarios activos: {len(remaining_users)}")
        for u in remaining_users:
            print(f"  * @{u.username} ({u.email}) [Admin: {u.is_admin}]")
        print(f"Ejercicios en catálogo: {len(remaining_exercises)}")
        print(f"Rutinas: {db.query(Routine).count()}")
        print(f"Entrenamientos agendados: {db.query(ScheduledWorkout).count()}")
        print(f"Grupos: {db.query(WorkoutGroup).count()}")
        print(f"Amistades: {db.query(Friendship).count()}")
        print(f"Notificaciones: {db.query(Notification).count()}")
        print("="*50)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error durante el reseteo: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
