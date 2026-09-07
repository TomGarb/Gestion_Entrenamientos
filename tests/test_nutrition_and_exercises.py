import os
os.environ["SECRET_KEY"] = "test-secret-key-12345678901234567890"
os.environ["TELEGRAM_BOT_TOKEN"] = "test-bot-token"

import unittest
from datetime import date, datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.models.workout import WorkoutLog
from app.models.nutrition import ConsumoDiario
from app.services.nutrition import parse_openfoodfacts_product
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


class TestNutritionAndExercises(unittest.TestCase):

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)

        # Crear usuario de prueba
        self.db = TestingSessionLocal()
        user = User(
            username="nutri_tester",
            email="nutri@example.com",
            weight_kg=80.0,
            height_cm=180.0,
        )
        user.set_password("SecurePass123!")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        self.user_id = user.id
        self.db.close()

        # Obtener token JWT
        login_res = client.post(
            "/api/auth/login",
            data={"username": "nutri_tester", "password": "SecurePass123!"},
        )
        self.assertEqual(login_res.status_code, 200, login_res.text)
        token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_openfoodfacts_parser_strict_fields(self):
        """Verifica que el parser de OpenFoodFacts extraiga exclusivamente nombre, calorías y macros."""
        raw_product = {
            "code": "8480000123456",
            "product_name": "Avena Integral Suave",
            "ignored_extra_field_1": "noise",
            "ingredients_text": "100% copos de avena",
            "nutriments": {
                "energy-kcal_100g": 375.0,
                "proteins_100g": 13.5,
                "carbohydrates_100g": 59.0,
                "fat_100g": 7.0,
                "sodium_100g": 0.02,
                "sugars_100g": 1.2,
                "fiber_100g": 10.0,
            },
        }

        parsed = parse_openfoodfacts_product(raw_product)
        self.assertIsNotNone(parsed)
        # Campos estrictos esperados
        self.assertEqual(
            set(parsed.keys()),
            {"name", "calories_100g", "proteins_100g", "carbs_100g", "fats_100g", "barcode"},
        )
        self.assertEqual(parsed["name"], "Avena Integral Suave")
        self.assertEqual(parsed["calories_100g"], 375.0)
        self.assertEqual(parsed["proteins_100g"], 13.5)
        self.assertEqual(parsed["carbs_100g"], 59.0)
        self.assertEqual(parsed["fats_100g"], 7.0)
        self.assertEqual(parsed["barcode"], "8480000123456")

    def test_nutrition_logging_and_daily_summary(self):
        """Verifica el registro de comidas con cálculo de porciones y resumen diario."""
        # 1. Registrar alimento especificando valores por 100g y gramos consumidos (150g)
        food_payload = {
            "food_name": "Pechuga de Pollo",
            "grams": 150.0,
            "calories_100g": 165.0,
            "proteins_100g": 31.0,
            "carbs_100g": 0.0,
            "fats_100g": 3.6,
        }
        res = client.post("/api/nutrition/log", json=food_payload, headers=self.headers)
        self.assertEqual(res.status_code, 201, res.text)
        data = res.json()
        self.assertEqual(data["food_name"], "Pechuga de Pollo")
        self.assertEqual(data["grams"], 150.0)
        # 165 * 1.5 = 247.5 kcal
        self.assertAlmostEqual(data["calories"], 247.5, places=1)
        # 31 * 1.5 = 46.5g de proteína
        self.assertAlmostEqual(data["proteins"], 46.5, places=1)

        # 2. Registrar alimento con alias en español (alimento, gramos, calorias directas)
        spanish_payload = {
            "alimento": "Arroz Blanco Cocido",
            "gramos": 200.0,
            "calorias": 260.0,
            "proteinas": 5.0,
            "carbohidratos": 56.0,
            "grasas": 0.6,
        }
        res_es = client.post("/api/nutrition/log", json=spanish_payload, headers=self.headers)
        self.assertEqual(res_es.status_code, 201, res_es.text)
        data_es = res_es.json()
        self.assertEqual(data_es["food_name"], "Arroz Blanco Cocido")
        self.assertEqual(data_es["calories"], 260.0)

        # 3. Consultar resumen diario
        today_str = date.today().isoformat()
        res_daily = client.get(f"/api/nutrition/daily?date={today_str}", headers=self.headers)
        self.assertEqual(res_daily.status_code, 200, res_daily.text)
        daily_data = res_daily.json()

        # Total consumido = 247.5 + 260.0 = 507.5
        self.assertAlmostEqual(daily_data["total_calories_consumed"], 507.5, places=1)
        self.assertAlmostEqual(daily_data["total_proteins"], 51.5, places=1)
        self.assertEqual(len(daily_data["items"]), 2)

    def test_workout_met_calories_burned_and_net_balance(self):
        """Verifica la fórmula MET (3.5 * peso_kg * duración_horas) al terminar entreno y su deducción en calorías netas."""
        # 1. Registrar un alimento: 600 kcal
        client.post(
            "/api/nutrition/log",
            json={"food_name": "Batido de Proteína y Fruta", "grams": 400.0, "calories": 600.0},
            headers=self.headers,
        )

        # 2. Iniciar sesión de entrenamiento
        start_res = client.post("/api/workouts/start", json={"notes": "Sesión de fuerza"}, headers=self.headers)
        self.assertEqual(start_res.status_code, 200, start_res.text)
        log_id = start_res.json()["id"]

        # 3. Modificar created_at para simular 60 minutos de duración en base de datos
        db = TestingSessionLocal()
        wlog = db.query(WorkoutLog).filter(WorkoutLog.id == log_id).first()
        wlog.created_at = datetime.now(timezone.utc) - timedelta(minutes=60)
        db.commit()
        db.close()

        # 4. Finalizar entrenamiento
        finish_res = client.put(f"/api/workouts/{log_id}/finish", headers=self.headers)
        self.assertEqual(finish_res.status_code, 200, finish_res.text)
        finished_data = finish_res.json()

        self.assertEqual(finished_data["status"], "completed")
        self.assertEqual(finished_data["duration_minutes"], 60)
        # Fórmula MET: 3.5 * 80kg * (60 / 60)h = 280.0 kcal
        expected_burned = round(3.5 * 80.0 * 1.0, 1)
        self.assertAlmostEqual(finished_data["calories_burned"], expected_burned, places=1)

        # 5. Comprobar que en /api/nutrition/daily las calorías netas son: 600 - 280 = 320
        res_daily = client.get("/api/nutrition/daily", headers=self.headers)
        self.assertEqual(res_daily.status_code, 200)
        daily = res_daily.json()

        self.assertEqual(daily["total_calories_consumed"], 600.0)
        self.assertEqual(daily["total_calories_burned"], expected_burned)
        self.assertAlmostEqual(daily["net_calories"], 600.0 - expected_burned, places=1)

    def test_quick_exercise_creation_spanish_and_english(self):
        """Verifica la creación rápida de ejercicios con alias en español e inglés, retornando inmediatamente con id."""
        # 1. Creación con alias en español
        spanish_ex = {
            "nombre": "Press Militar con Mancuernas",
            "grupo_muscular": "Hombros",
            "descripcion": "Sentado en banco a 75 grados",
            "equipamiento": "Mancuernas",
        }
        res_es = client.post("/api/exercises", json=spanish_ex, headers=self.headers)
        self.assertIn(res_es.status_code, [200, 201], res_es.text)
        data_es = res_es.json()
        self.assertIn("id", data_es)
        self.assertEqual(data_es["name"], "Press Militar con Mancuernas")
        self.assertEqual(data_es["muscle_group"], "Hombros")
        self.assertEqual(data_es["description"], "Sentado en banco a 75 grados")
        self.assertTrue(data_es["is_custom"])

        # 2. Creación con alias en inglés y sin trailing slash
        english_ex = {
            "name": "Remo con Barra T",
            "muscle_group": "Espalda",
            "description": "Agarre cerrado neutro",
            "is_bodyweight": False,
        }
        res_en = client.post("/api/exercises", json=english_ex, headers=self.headers)
        self.assertIn(res_en.status_code, [200, 201], res_en.text)
        data_en = res_en.json()
        self.assertIn("id", data_en)
        self.assertEqual(data_en["name"], "Remo con Barra T")
        self.assertEqual(data_en["muscle_group"], "Espalda")
