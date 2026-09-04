import os
os.environ["SECRET_KEY"] = "test-secret-key-12345"
os.environ["TELEGRAM_BOT_TOKEN"] = "test-bot-token"

import unittest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.exercise import Exercise
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

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

class TestAuthAndAnalytics(unittest.TestCase):

    def setUp(self):
        Base.metadata.create_all(bind=engine)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_register_and_login_case_insensitivity(self):
        # 1. Registrar con mayúsculas y espacios
        reg_payload = {
            "username": "  Tomas  ",
            "email": "  Tomas@Example.COM  ",
            "password": "SecurePassword123!"
        }
        res_reg = client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200, res_reg.text)
        data = res_reg.json()
        self.assertEqual(data["username"], "tomas")
        self.assertEqual(data["email"], "tomas@example.com")

        # 2. Intentar registrar un usuario duplicado con distinta capitalización
        duplicate_payload = {
            "username": "TOMAS",
            "email": "different@example.com",
            "password": "Password456!"
        }
        res_dup = client.post("/api/auth/register", json=duplicate_payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("El usuario o email ya existe", res_dup.json()["detail"])

        duplicate_email_payload = {
            "username": "anotheruser",
            "email": "TOMAS@EXAMPLE.COM",
            "password": "Password456!"
        }
        res_dup_email = client.post("/api/auth/register", json=duplicate_email_payload)
        self.assertEqual(res_dup_email.status_code, 400)

        # 3. Iniciar sesión usando email con mayúsculas
        login_res_email = client.post(
            "/api/auth/login",
            data={"username": "TOMAS@example.com", "password": "SecurePassword123!"}
        )
        self.assertEqual(login_res_email.status_code, 200, login_res_email.text)
        token_data = login_res_email.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]

        # 4. Iniciar sesión usando username con mayúsculas y espacios
        login_res_user = client.post(
            "/api/auth/login",
            data={"username": "  TOMAS  ", "password": "SecurePassword123!"}
        )
        self.assertEqual(login_res_user.status_code, 200, login_res_user.text)

        # 5. Actualizar perfil /me con mayúsculas y validar normalización
        update_payload = {
            "username": "  TomasNuevo  ",
            "email": "  NuevoEmail@Example.COM  "
        }
        res_update = client.put(
            "/api/auth/me",
            json=update_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res_update.status_code, 200, res_update.text)
        updated_data = res_update.json()
        self.assertEqual(updated_data["username"], "tomasnuevo")
        self.assertEqual(updated_data["email"], "nuevoemail@example.com")

    def test_activity_heatmap_levels(self):
        db = TestingSessionLocal()
        user = User(username="athlete", email="athlete@test.com")
        user.set_password("pass123")
        db.add(user)
        db.commit()
        db.refresh(user)

        ex = Exercise(name="Sentadillas", muscle_group="Piernas", is_custom=False)
        db.add(ex)
        db.commit()
        db.refresh(ex)

        # Crear 3 sesiones con diferentes intensidades:
        # Día 1: Ligera (4 series x 50kg x 10 reps = 2.000 kg -> Level 1)
        today = date.today()
        log1 = WorkoutLog(user_id=user.id, date=today - timedelta(days=2), status="completed")
        db.add(log1)
        db.commit()
        db.refresh(log1)
        for i in range(4):
            db.add(WorkoutSet(workout_log_id=log1.id, exercise_id=ex.id, set_number=i+1, reps_completed=10, weight_kg=50.0))

        # Día 2: Estándar (10 series x 50kg x 10 reps = 5.000 kg -> Level 2)
        log2 = WorkoutLog(user_id=user.id, date=today - timedelta(days=1), status="completed")
        db.add(log2)
        db.commit()
        db.refresh(log2)
        for i in range(10):
            db.add(WorkoutSet(workout_log_id=log2.id, exercise_id=ex.id, set_number=i+1, reps_completed=10, weight_kg=50.0))

        # Día 3: Alto volumen (20 series x 60kg x 10 reps = 12.000 kg -> Level 3)
        log3 = WorkoutLog(user_id=user.id, date=today, status="completed")
        db.add(log3)
        db.commit()
        db.refresh(log3)
        for i in range(20):
            db.add(WorkoutSet(workout_log_id=log3.id, exercise_id=ex.id, set_number=i+1, reps_completed=10, weight_kg=60.0))

        db.commit()

        # Iniciar sesión y consultar /api/analytics/activity-heatmap
        login_res = client.post("/api/auth/login", data={"username": "athlete", "password": "pass123"})
        token = login_res.json()["access_token"]

        heat_res = client.get("/api/analytics/activity-heatmap", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(heat_res.status_code, 200, heat_res.text)
        heatmap_data = heat_res.json()
        self.assertEqual(len(heatmap_data), 3)

        levels = {item["date"]: item["level"] for item in heatmap_data}
        self.assertEqual(levels[str(today - timedelta(days=2))], 1)
        self.assertEqual(levels[str(today - timedelta(days=1))], 2)
        self.assertEqual(levels[str(today)], 3)

        db.close()

if __name__ == "__main__":
    unittest.main()
