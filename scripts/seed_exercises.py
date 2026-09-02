import os
import sys
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Añadir el directorio raíz al path para importar desde app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.exercise import Exercise

load_dotenv()

EXERCISES_DATA = [
    # PECHO
    {"name": "Press de banca plano (Barra)", "muscle_group": "pecho", "equipment": "Barra"},
    {"name": "Press de banca inclinado (Mancuernas)", "muscle_group": "pecho", "equipment": "Mancuernas"},
    {"name": "Press de banca declinado (Barra)", "muscle_group": "pecho", "equipment": "Barra"},
    {"name": "Aperturas con mancuernas", "muscle_group": "pecho", "equipment": "Mancuernas"},
    {"name": "Cruces en polea", "muscle_group": "pecho", "equipment": "Poleas"},
    {"name": "Fondos en paralelas (Pecho)", "muscle_group": "pecho", "equipment": "Peso corporal"},
    {"name": "Flexiones de pecho (Push-ups)", "muscle_group": "pecho", "equipment": "Peso corporal"},
    {"name": "Press en máquina (Chest Press)", "muscle_group": "pecho", "equipment": "Máquina"},
    {"name": "Pullover con mancuerna", "muscle_group": "pecho", "equipment": "Mancuerna"},
    {"name": "Pec Deck (Máquina de aperturas)", "muscle_group": "pecho", "equipment": "Máquina"},

    # ESPALDA
    {"name": "Dominadas (Pull-ups)", "muscle_group": "espalda", "equipment": "Peso corporal"},
    {"name": "Peso muerto (Deadlift)", "muscle_group": "espalda", "equipment": "Barra"},
    {"name": "Remo con barra", "muscle_group": "espalda", "equipment": "Barra"},
    {"name": "Remo en polea baja (Gironda)", "muscle_group": "espalda", "equipment": "Poleas"},
    {"name": "Jalón al pecho en polea alta", "muscle_group": "espalda", "equipment": "Poleas"},
    {"name": "Remo con mancuerna a una mano", "muscle_group": "espalda", "equipment": "Mancuerna"},
    {"name": "Remo en T (T-Bar Row)", "muscle_group": "espalda", "equipment": "Barra"},
    {"name": "Hiperextensiones", "muscle_group": "espalda", "equipment": "Peso corporal / Máquina"},
    {"name": "Face pull", "muscle_group": "espalda", "equipment": "Poleas"},
    {"name": "Dominadas supinas (Chin-ups)", "muscle_group": "espalda", "equipment": "Peso corporal"},

    # PIERNAS
    {"name": "Sentadilla libre con barra", "muscle_group": "piernas", "equipment": "Barra"},
    {"name": "Prensa de piernas (Leg Press)", "muscle_group": "piernas", "equipment": "Máquina"},
    {"name": "Peso muerto rumano", "muscle_group": "piernas", "equipment": "Barra"},
    {"name": "Zancadas (Lunges)", "muscle_group": "piernas", "equipment": "Mancuernas / Barra"},
    {"name": "Extensión de cuádriceps en máquina", "muscle_group": "piernas", "equipment": "Máquina"},
    {"name": "Curl de isquiotibiales (Sentado/Tumbado)", "muscle_group": "piernas", "equipment": "Máquina"},
    {"name": "Sentadilla Búlgara", "muscle_group": "piernas", "equipment": "Mancuernas / Peso corporal"},
    {"name": "Elevación de talones (Gemelos de pie)", "muscle_group": "piernas", "equipment": "Máquina / Peso corporal"},
    {"name": "Elevación de talones (Gemelos sentado)", "muscle_group": "piernas", "equipment": "Máquina"},
    {"name": "Hip Thrust (Empuje de cadera)", "muscle_group": "piernas", "equipment": "Barra / Máquina"},
    {"name": "Sentadilla frontal (Front Squat)", "muscle_group": "piernas", "equipment": "Barra"},
    {"name": "Abductores en máquina", "muscle_group": "piernas", "equipment": "Máquina"},

    # HOMBROS
    {"name": "Press militar con barra", "muscle_group": "hombros", "equipment": "Barra"},
    {"name": "Press de hombros con mancuernas", "muscle_group": "hombros", "equipment": "Mancuernas"},
    {"name": "Elevaciones laterales con mancuernas", "muscle_group": "hombros", "equipment": "Mancuernas"},
    {"name": "Elevaciones frontales", "muscle_group": "hombros", "equipment": "Mancuernas / Disco"},
    {"name": "Pájaros (Elevaciones posteriores)", "muscle_group": "hombros", "equipment": "Mancuernas"},
    {"name": "Remo al mentón", "muscle_group": "hombros", "equipment": "Barra / Poleas"},
    {"name": "Encogimientos de hombros (Trapecios)", "muscle_group": "hombros", "equipment": "Mancuernas / Barra"},
    {"name": "Press Arnold", "muscle_group": "hombros", "equipment": "Mancuernas"},
    {"name": "Elevaciones laterales en polea", "muscle_group": "hombros", "equipment": "Poleas"},
    {"name": "Máquina de press de hombros", "muscle_group": "hombros", "equipment": "Máquina"},

    # BRAZOS
    {"name": "Curl de bíceps con barra (Z o recta)", "muscle_group": "brazos", "equipment": "Barra"},
    {"name": "Curl de bíceps alterno con mancuernas", "muscle_group": "brazos", "equipment": "Mancuernas"},
    {"name": "Curl martillo", "muscle_group": "brazos", "equipment": "Mancuernas"},
    {"name": "Curl predicador (Scott)", "muscle_group": "brazos", "equipment": "Barra / Máquina"},
    {"name": "Extensiones de tríceps en polea alta", "muscle_group": "brazos", "equipment": "Poleas"},
    {"name": "Press francés", "muscle_group": "brazos", "equipment": "Barra Z"},
    {"name": "Fondos de tríceps (Banco)", "muscle_group": "brazos", "equipment": "Peso corporal"},
    {"name": "Patada de tríceps", "muscle_group": "brazos", "equipment": "Mancuernas"},
    {"name": "Extensiones de tríceps sobre la cabeza", "muscle_group": "brazos", "equipment": "Poleas / Mancuerna"},
    {"name": "Curl de bíceps en polea baja", "muscle_group": "brazos", "equipment": "Poleas"},

    # CORE
    {"name": "Crunch abdominal (Encogimientos)", "muscle_group": "core", "equipment": "Peso corporal"},
    {"name": "Plancha abdominal (Plank)", "muscle_group": "core", "equipment": "Peso corporal"},
    {"name": "Elevaciones de piernas colgado", "muscle_group": "core", "equipment": "Barra de dominadas"},
    {"name": "Rueda abdominal (Ab Roller)", "muscle_group": "core", "equipment": "Rueda"},
    {"name": "Giros rusos (Russian Twists)", "muscle_group": "core", "equipment": "Disco / Peso corporal"},
    {"name": "Plancha lateral", "muscle_group": "core", "equipment": "Peso corporal"},
    {"name": "Elevaciones de piernas acostado", "muscle_group": "core", "equipment": "Peso corporal"},
    {"name": "Crunch en polea alta", "muscle_group": "core", "equipment": "Poleas"},
    {"name": "Abdominales en V (V-Ups)", "muscle_group": "core", "equipment": "Peso corporal"},
    {"name": "Toques al talón (Heel Touches)", "muscle_group": "core", "equipment": "Peso corporal"},

    # CARDIO
    {"name": "Cinta de correr (Treadmill)", "muscle_group": "cardio", "equipment": "Máquina"},
    {"name": "Bicicleta estática", "muscle_group": "cardio", "equipment": "Máquina"},
    {"name": "Elíptica", "muscle_group": "cardio", "equipment": "Máquina"},
    {"name": "Máquina de remo (Ergómetro)", "muscle_group": "cardio", "equipment": "Máquina"},
    {"name": "Salto a la cuerda", "muscle_group": "cardio", "equipment": "Cuerda"},
    {"name": "Escaladora (Stairmaster)", "muscle_group": "cardio", "equipment": "Máquina"},
    {"name": "Sprints", "muscle_group": "cardio", "equipment": "Peso corporal"},
    {"name": "Burpees", "muscle_group": "cardio", "equipment": "Peso corporal"}
]

def seed_db():
    db: Session = SessionLocal()
    added_count = 0
    skipped_count = 0

    try:
        for ex_data in EXERCISES_DATA:
            # Comprobar si ya existe un ejercicio con ese nombre (ignorar mayúsculas/minúsculas)
            existing = db.query(Exercise).filter(Exercise.name.ilike(ex_data["name"])).first()
            if not existing:
                new_exercise = Exercise(
                    name=ex_data["name"],
                    muscle_group=ex_data["muscle_group"],
                    equipment=ex_data["equipment"],
                    description=f"Ejercicio compuesto para {ex_data['muscle_group']}.",
                    is_custom=False,
                    user_id=None # Es un ejercicio global del sistema
                )
                db.add(new_exercise)
                added_count += 1
            else:
                skipped_count += 1
        
        db.commit()
        print(f"[EXITO] Se agregaron {added_count} ejercicios exitosamente.")
        print(f"[SKIP]  Se omitieron {skipped_count} ejercicios (ya existian).")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error insertando ejercicios: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
