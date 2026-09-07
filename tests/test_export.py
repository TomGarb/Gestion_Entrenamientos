import os
os.environ["SECRET_KEY"] = "test-secret-key-12345678901234567890"
os.environ["TELEGRAM_BOT_TOKEN"] = "test-bot-token"

import csv
import io
import json
import unittest
from datetime import date, datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.nutrition import ConsumoDiario
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


class TestExportMetrics(unittest.TestCase):

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)

        # Crear usuario y datos de prueba
        self.db = TestingSessionLocal()
        user = User(
            username="exporter",
            email="export@example.com",
            weight_kg=75.0,
            height_cm=175.0,
        )
        user.set_password("ExportPass123!")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        self.user_id = user.id

        # Ejercicio
        ex = Exercise(
            name="Press de Banca Plano",
            muscle_group="Pecho",
            is_custom=False,
            user_id=None,
        )
        self.db.add(ex)
        self.db.commit()
        self.db.refresh(ex)
        self.exercise_id = ex.id

        # Rutina
        routine = Routine(
            name="Pecho y Tríceps",
            description="Fuerza e hipertrofia",
            user_id=user.id,
        )
        self.db.add(routine)
        self.db.commit()
        self.db.refresh(routine)

        # Workout Log con 2 sets
        today = date.today()
        wlog = WorkoutLog(
            user_id=user.id,
            routine_id=routine.id,
            date=today,
            status="completed",
            duration_minutes=45,
            calories_burned=196.9,
            notes="Muy buena sesión",
        )
        self.db.add(wlog)
        self.db.commit()
        self.db.refresh(wlog)

        s1 = WorkoutSet(
            workout_log_id=wlog.id,
            exercise_id=ex.id,
            set_number=1,
            weight_kg=80.0,
            reps_completed=10,
            rpe=8,
            notes="Buena técnica",
        )
        s2 = WorkoutSet(
            workout_log_id=wlog.id,
            exercise_id=ex.id,
            set_number=2,
            weight_kg=85.0,
            reps_completed=8,
            rpe=9,
        )
        self.db.add_all([s1, s2])

        # Consumos nutricionales
        c1 = ConsumoDiario(
            user_id=user.id,
            date=today,
            food_name="Arroz con Pollo",
            grams=250.0,
            calories=420.0,
            proteins=35.0,
            carbs=50.0,
            fats=8.0,
        )
        c2 = ConsumoDiario(
            user_id=user.id,
            date=today,
            food_name="Manzana",
            grams=150.0,
            calories=78.0,
            proteins=0.4,
            carbs=20.0,
            fats=0.3,
        )
        self.db.add_all([c1, c2])
        self.db.commit()
        self.db.close()

        # Login para token JWT
        login_res = client.post(
            "/api/auth/login",
            data={"username": "exporter", "password": "ExportPass123!"},
        )
        self.assertEqual(login_res.status_code, 200, login_res.text)
        token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_export_stats(self):
        """Verifica que el endpoint /api/export/stats reporte los conteos precisos."""
        res = client.get("/api/export/stats", headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["total_workouts"], 1)
        self.assertEqual(data["total_sets"], 2)
        self.assertEqual(data["total_nutrition_logs"], 2)
        self.assertEqual(data["total_routines"], 1)
        self.assertEqual(data["user_weight_kg"], 75.0)

    def test_export_workouts_csv(self):
        """Verifica la exportación de entrenamientos en CSV con cabeceras y UTF-8 BOM."""
        res = client.get("/api/export/workouts?format=csv", headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        self.assertIn("attachment", res.headers.get("content-disposition", ""))
        self.assertIn("gymtracker_entrenamientos", res.headers.get("content-disposition", ""))

        text = res.content.decode("utf-8")
        # Verificar BOM UTF-8 (\ufeff)
        self.assertTrue(text.startswith("\ufeff"))

        # Parsear filas
        reader = csv.reader(io.StringIO(text.lstrip("\ufeff")))
        rows = list(reader)
        self.assertGreater(len(rows), 2)  # Header + 2 sets
        header = rows[0]
        self.assertIn("Fecha", header)
        self.assertIn("Rutina", header)
        self.assertIn("Ejercicio", header)
        self.assertIn("Peso_Kg", header)
        self.assertIn("Volumen_Serie_Kg", header)

        # Validar primera serie (80kg x 10 = 800 volumen)
        first_row = rows[1]
        self.assertIn("Pecho y Tríceps", first_row)
        self.assertIn("Press de Banca Plano", first_row)
        self.assertIn("80.0", first_row)
        self.assertIn("10", first_row)
        self.assertIn("800.0", first_row)

    def test_export_workouts_json(self):
        """Verifica la exportación de entrenamientos en formato JSON estructurado."""
        res = client.get("/api/export/workouts?format=json", headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("application/json", res.headers.get("content-type", ""))

        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        workout = data[0]
        self.assertEqual(workout["routine_name"], "Pecho y Tríceps")
        self.assertEqual(len(workout["sets"]), 2)
        self.assertEqual(workout["sets"][0]["exercise_name"], "Press de Banca Plano")
        self.assertEqual(workout["sets"][0]["weight_kg"], 80.0)

    def test_export_nutrition_csv_and_json(self):
        """Verifica la exportación de nutrición en CSV y JSON."""
        # 1. CSV
        res_csv = client.get("/api/export/nutrition?format=csv", headers=self.headers)
        self.assertEqual(res_csv.status_code, 200)
        text_csv = res_csv.content.decode("utf-8")
        self.assertTrue(text_csv.startswith("\ufeff"))
        self.assertIn("Arroz con Pollo", text_csv)
        self.assertIn("Manzana", text_csv)

        # 2. JSON
        res_json = client.get("/api/export/nutrition?format=json", headers=self.headers)
        data_json = res_json.json()
        self.assertEqual(len(data_json), 2)
        food_names = {it["food_name"] for it in data_json}
        self.assertIn("Arroz con Pollo", food_names)
        self.assertIn("Manzana", food_names)

    def test_export_consolidated_summary_csv(self):
        """Verifica la exportación de resumen consolidado diario."""
        res = client.get("/api/export/summary?format=csv", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        text = res.content.decode("utf-8")
        self.assertTrue(text.startswith("\ufeff"))

        reader = csv.reader(io.StringIO(text.lstrip("\ufeff")))
        rows = list(reader)
        self.assertEqual(len(rows), 2)  # Header + 1 día consolidado
        header = rows[0]
        self.assertIn("Calorias_Consumidas_Kcal", header)
        self.assertIn("Calorias_Quemadas_Kcal", header)
        self.assertIn("Calorias_Netas_Kcal", header)
        self.assertIn("Volumen_Total_Kg", header)

        day_row = rows[1]
        # Consumido: 420 + 78 = 498.0 kcal
        self.assertIn("498.0", day_row)
        # Quemado MET: 196.9 kcal
        self.assertIn("196.9", day_row)
        # Tonelaje: (80*10) + (85*8) = 800 + 680 = 1480.0 kg
        self.assertIn("1480.0", day_row)

    def test_export_backup_json(self):
        """Verifica la copia de seguridad completa maestra en JSON."""
        res = client.get("/api/export/backup", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("user_profile", data)
        self.assertIn("workouts", data)
        self.assertIn("nutrition", data)
        self.assertIn("routines", data)

        self.assertEqual(data["user_profile"]["username"], "exporter")
        self.assertEqual(len(data["workouts"]), 1)
        self.assertEqual(len(data["nutrition"]), 2)
        self.assertEqual(len(data["routines"]), 1)
