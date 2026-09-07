from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as dt_date, date

from app.database import get_db
from app.models.nutrition import ConsumoDiario
from app.models.workout import WorkoutLog
from app.models.user import User
from app.schemas.nutrition import (
    ConsumoDiarioCreate,
    ConsumoDiarioResponse,
    DailyNutritionSummary,
    FoodItemProduct,
)
from app.api.deps import get_current_user
from app.services.nutrition import get_food_by_barcode, search_food_by_query

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


@router.get("/barcode/{barcode}", response_model=FoodItemProduct)
def lookup_barcode(barcode: str, current_user: User = Depends(get_current_user)):
    """Busca un producto alimenticio en OpenFoodFacts por su código de barras."""
    product = get_food_by_barcode(barcode)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Código de barras '{barcode}' no encontrado en OpenFoodFacts.",
        )
    return product


@router.get("/search", response_model=List[FoodItemProduct])
def search_food(
    q: str = Query(..., min_length=1, description="Término de búsqueda"),
    current_user: User = Depends(get_current_user),
):
    """Busca alimentos en OpenFoodFacts por nombre o texto."""
    results = search_food_by_query(q)
    return results


@router.get("/daily", response_model=DailyNutritionSummary)
def get_daily_nutrition_summary(
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene el balance calórico y macronutrientes del día:
    - Calorías consumidas (suma de alimentos registrados)
    - Calorías quemadas (fórmula MET en entrenamientos completados)
    - Calorías netas (consumidas - quemadas)
    - Desglose de macronutrientes (proteínas, carbohidratos, grasas)
    """
    check_date = target_date or dt_date.today()

    # 1. Alimentos consumidos en la fecha
    consumos = (
        db.query(ConsumoDiario)
        .filter(ConsumoDiario.user_id == current_user.id, ConsumoDiario.date == check_date)
        .order_by(ConsumoDiario.created_at.desc())
        .all()
    )

    total_consumed = sum(c.calories for c in consumos)
    total_proteins = sum(c.proteins for c in consumos)
    total_carbs = sum(c.carbs for c in consumos)
    total_fats = sum(c.fats for c in consumos)

    # 2. Entrenamientos completados en la fecha para calcular gasto calórico MET
    workouts = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.date == check_date)
        .all()
    )

    user_weight = (
        current_user.weight_kg
        if (current_user.weight_kg and current_user.weight_kg > 0)
        else 70.0
    )

    total_burned = 0.0
    for w in workouts:
        if w.calories_burned and w.calories_burned > 0:
            total_burned += w.calories_burned
        elif w.duration_minutes and w.duration_minutes > 0:
            # Fórmula MET: 3.5 * peso_kg * (duracion_mins / 60)
            burned = 3.5 * user_weight * (w.duration_minutes / 60.0)
            total_burned += burned

    total_burned = round(total_burned, 1)
    total_consumed = round(total_consumed, 1)
    net_calories = round(total_consumed - total_burned, 1)

    # 3. Metas nutricionales desde user.extra_data o valores recomendados por defecto
    user_extra = current_user.extra_data or {}
    goals = user_extra.get("nutrition_goals", {})
    target_calories = float(goals.get("target_calories", 2000.0))
    target_proteins = float(goals.get("target_proteins", 140.0))
    target_carbs = float(goals.get("target_carbs", 220.0))
    target_fats = float(goals.get("target_fats", 65.0))

    return DailyNutritionSummary(
        date=check_date,
        total_calories_consumed=total_consumed,
        total_calories_burned=total_burned,
        net_calories=net_calories,
        total_proteins=round(total_proteins, 1),
        total_carbs=round(total_carbs, 1),
        total_fats=round(total_fats, 1),
        target_calories=target_calories,
        target_proteins=target_proteins,
        target_carbs=target_carbs,
        target_fats=target_fats,
        items=consumos,
    )


@router.post("/log", response_model=ConsumoDiarioResponse, status_code=status.HTTP_201_CREATED)
def log_food_consumption(
    food_in: ConsumoDiarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra el consumo de un alimento en la base de datos."""
    if not food_in.food_name.strip():
        raise HTTPException(status_code=400, detail="El nombre del alimento es requerido.")

    target_date = food_in.date or dt_date.today()

    new_consumo = ConsumoDiario(
        user_id=current_user.id,
        date=target_date,
        food_name=food_in.food_name.strip(),
        grams=max(round(food_in.grams, 1), 0.1),
        calories=round(food_in.calories or 0.0, 1),
        proteins=round(food_in.proteins or 0.0, 1),
        carbs=round(food_in.carbs or 0.0, 1),
        fats=round(food_in.fats or 0.0, 1),
        barcode=food_in.barcode,
    )
    db.add(new_consumo)
    db.commit()
    db.refresh(new_consumo)
    return new_consumo


@router.delete("/log/{log_id}", status_code=status.HTTP_200_OK)
def delete_food_consumption(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un alimento registrado previamente."""
    consumo = (
        db.query(ConsumoDiario)
        .filter(ConsumoDiario.id == log_id, ConsumoDiario.user_id == current_user.id)
        .first()
    )
    if not consumo:
        raise HTTPException(status_code=404, detail="Registro de alimento no encontrado.")

    db.delete(consumo)
    db.commit()
    return {"detail": "Alimento eliminado correctamente."}
