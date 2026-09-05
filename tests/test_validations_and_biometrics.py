import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.workout import WorkoutLog, WorkoutSet
from app.core.security import create_access_token
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

class TestValidationsAndBiometrics(unittest.TestCase):

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_user_registration_with_biometrics(self):
        payload = {
            "username": "atleta1",
            "email": "atleta1@test.com",
            "password": "Password123!",
            "peso": 78.5,
            "altura": 182.0,
            "foto_perfil": "https://example.com/photo.jpg"
        }
        res = client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["username"], "atleta1")
        self.assertEqual(data["weight_kg"], 78.5)
        self.assertEqual(data["height_cm"], 182.0)
        self.assertEqual(data["foto_perfil"], "https://example.com/photo.jpg")

    def test_duplicate_username_validation(self):
        # 1er registro
        client.post("/api/auth/register", json={
            "username": "ironman",
            "email": "tony@stark.com",
            "password": "pass",
            "peso": 85.0,
            "altura": 185.0
        })

        # 2do registro con el mismo username (case-insensitive)
        res2 = client.post("/api/auth/register", json={
            "username": "IronMan",
            "email": "tony2@stark.com",
            "password": "pass",
            "peso": 80.0,
            "altura": 180.0
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("nombre de usuario ya está en uso", res2.json()["detail"])

    def test_custom_exercise_with_is_bodyweight(self):
        db = TestingSessionLocal()
        user = User(username="trainer", email="trainer@test.com", password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": user.username, "id": user.id})
        headers = {"Authorization": f"Bearer {token}"}

        # Crear ejercicio con is_bodyweight = True
        res = client.post("/api/exercises/", json={
            "name": "Dominadas Lastradas",
            "muscle_group": "espalda",
            "equipment": "Peso corporal",
            "description": "Dominadas con cinto de lastre",
            "is_bodyweight": True
        }, headers=headers)

        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["name"], "Dominadas Lastradas")
        self.assertTrue(data["is_bodyweight"])

    def test_routine_set_limiter_enforcement(self):
        db = TestingSessionLocal()
        user = User(username="lifter", email="lifter@test.com", password_hash="hash", weight_kg=75.0, height_cm=175.0)
        db.add(user)
        db.commit()
        db.refresh(user)

        exercise = Exercise(name="Press Militar", muscle_group="hombros", equipment="Barra")
        db.add(exercise)
        db.commit()
        db.refresh(exercise)

        # Rutina con 2 sets límite
        routine = Routine(name="Push Day Plan", user_id=user.id)
        db.add(routine)
        db.commit()
        db.refresh(routine)

        r_ex = RoutineExercise(routine_id=routine.id, exercise_id=exercise.id, sets=2, reps=8)
        db.add(r_ex)
        db.commit()

        token = create_access_token(data={"sub": user.username, "id": user.id})
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Iniciar entrenamiento basado en la rutina
        start_res = client.post("/api/workouts/start", json={"routine_id": routine.id}, headers=headers)
        self.assertEqual(start_res.status_code, 200, start_res.text)
        log_id = start_res.json()["id"]

        # 2. Agregar Serie 1 (Permitida)
        set1_res = client.post(f"/api/workouts/{log_id}/sets", json={
            "exercise_id": exercise.id,
            "weight_kg": 50.0,
            "reps_completed": 8
        }, headers=headers)
        self.assertEqual(set1_res.status_code, 200, set1_res.text)

        # 3. Agregar Serie 2 (Permitida - 2/2)
        set2_res = client.post(f"/api/workouts/{log_id}/sets", json={
            "exercise_id": exercise.id,
            "weight_kg": 50.0,
            "reps_completed": 8
        }, headers=headers)
        self.assertEqual(set2_res.status_code, 200, set2_res.text)

        # 4. Agregar Serie 3 (Excedida -> Debe rechazar con 400)
        set3_res = client.post(f"/api/workouts/{log_id}/sets", json={
            "exercise_id": exercise.id,
            "weight_kg": 50.0,
            "reps_completed": 8
        }, headers=headers)
        self.assertEqual(set3_res.status_code, 400)
        self.assertIn("Límite alcanzado", set3_res.json()["detail"])
