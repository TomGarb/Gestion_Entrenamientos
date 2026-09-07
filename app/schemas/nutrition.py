"""
Esquemas Pydantic para el módulo de Nutrición.
"""

from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional, List, Any
from datetime import date, datetime


class FoodItemProduct(BaseModel):
    """Representa un producto alimenticio devuelto por OpenFoodFacts."""
    name: str
    calories_100g: float = 0.0
    proteins_100g: float = 0.0
    carbs_100g: float = 0.0
    fats_100g: float = 0.0
    barcode: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)


class ConsumoDiarioCreate(BaseModel):
    """Payload para registrar un consumo de alimento."""
    food_name: str
    grams: float = 100.0
    calories: Optional[float] = None
    proteins: Optional[float] = 0.0
    carbs: Optional[float] = 0.0
    fats: Optional[float] = 0.0

    # Valores base por 100g si se calculan en servidor
    calories_100g: Optional[float] = None
    proteins_100g: Optional[float] = None
    carbs_100g: Optional[float] = None
    fats_100g: Optional[float] = None

    barcode: Optional[str] = None
    date: Optional[date] = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases_and_calculations(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        # Mapeo de alias en español
        food_name = values.get("food_name") or values.get("alimento") or ""
        grams = float(values.get("grams") or values.get("gramos") or 100.0)

        calories = values.get("calories") or values.get("calorias")
        proteins = values.get("proteins") or values.get("proteinas")
        carbs = values.get("carbs") or values.get("carbohidratos")
        fats = values.get("fats") or values.get("grasas")

        c100 = values.get("calories_100g")
        p100 = values.get("proteins_100g")
        carb100 = values.get("carbs_100g")
        f100 = values.get("fats_100g")

        # Si no se dieron calorías directas pero sí por 100g, calcular según gramos
        if calories is None and c100 is not None:
            calories = round((float(c100) * grams) / 100.0, 1)
        if (proteins is None or proteins == 0.0) and p100 is not None:
            proteins = round((float(p100) * grams) / 100.0, 1)
        if (carbs is None or carbs == 0.0) and carb100 is not None:
            carbs = round((float(carb100) * grams) / 100.0, 1)
        if (fats is None or fats == 0.0) and f100 is not None:
            fats = round((float(f100) * grams) / 100.0, 1)

        values["food_name"] = food_name
        values["grams"] = grams
        values["calories"] = round(float(calories or 0.0), 1)
        values["proteins"] = round(float(proteins or 0.0), 1)
        values["carbs"] = round(float(carbs or 0.0), 1)
        values["fats"] = round(float(fats or 0.0), 1)

        return values


class ConsumoDiarioResponse(BaseModel):
    """Representa un alimento registrado en base de datos."""
    id: int
    user_id: int
    date: date
    food_name: str
    grams: float
    calories: float
    proteins: float
    carbs: float
    fats: float
    barcode: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyNutritionSummary(BaseModel):
    """Resumen diario de balance calórico y macronutrientes."""
    date: date
    total_calories_consumed: float
    total_calories_burned: float
    net_calories: float
    total_proteins: float
    total_carbs: float
    total_fats: float
    target_calories: float
    target_proteins: float
    target_carbs: float
    target_fats: float
    items: List[ConsumoDiarioResponse] = []

    model_config = ConfigDict(from_attributes=True)
