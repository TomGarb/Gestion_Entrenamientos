"""
Router de Exportación de Datos — Genera archivos CSV y JSON con las métricas y registros del usuario.
"""

import csv
import io
import json
from datetime import date as dt_date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.nutrition import ConsumoDiario
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/export", tags=["export"])


def _calculate_date_filter(period: str, start_date: Optional[dt_date], end_date: Optional[dt_date]):
    """Calcula las fechas de inicio y fin según el período seleccionado."""
    today = dt_date.today()
    if start_date and end_date:
        return start_date, end_date
    if period == "30d":
        return today - timedelta(days=30), today
    elif period == "90d":
        return today - timedelta(days=90), today
    elif period == "year":
        return dt_date(today.year, 1, 1), today
    # "all" o desconocido
    return None, None


@router.get("/stats")
def get_export_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna un conteo rápido de los registros disponibles para exportar."""
    total_workouts = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == current_user.id)
        .count()
    )
    total_sets = (
        db.query(WorkoutSet)
        .join(WorkoutLog, WorkoutLog.id == WorkoutSet.workout_log_id)
        .filter(WorkoutLog.user_id == current_user.id)
        .count()
    )
    total_nutrition = (
        db.query(ConsumoDiario)
        .filter(ConsumoDiario.user_id == current_user.id)
        .count()
    )
    total_routines = (
        db.query(Routine)
        .filter(Routine.user_id == current_user.id)
        .count()
    )

    return {
        "total_workouts": total_workouts,
        "total_sets": total_sets,
        "total_nutrition_logs": total_nutrition,
        "total_routines": total_routines,
        "user_weight_kg": current_user.weight_kg,
        "user_height_cm": current_user.height_cm,
    }


@router.get("/workouts")
def export_workouts(
    format: str = Query("csv", pattern="^(csv|json)$"),
    period: str = Query("all", pattern="^(all|30d|90d|year)$"),
    start_date: Optional[dt_date] = None,
    end_date: Optional[dt_date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporta el historial de entrenamientos y series de fuerza detallado en CSV o JSON.
    """
    s_date, e_date = _calculate_date_filter(period, start_date, end_date)

    query = (
        db.query(WorkoutLog)
        .options(
            joinedload(WorkoutLog.routine),
            joinedload(WorkoutLog.sets).joinedload(WorkoutSet.exercise),
        )
        .filter(WorkoutLog.user_id == current_user.id)
    )

    if s_date:
        query = query.filter(WorkoutLog.date >= s_date)
    if e_date:
        query = query.filter(WorkoutLog.date <= e_date)

    logs = query.order_by(WorkoutLog.date.desc(), WorkoutLog.id.desc()).all()

    filename_date = dt_date.today().isoformat()

    if format == "json":
        data = []
        for log in logs:
            workout_dict = {
                "id": log.id,
                "date": log.date.isoformat() if log.date else None,
                "routine_name": log.routine.name if log.routine else "Entrenamiento Libre",
                "status": log.status,
                "duration_minutes": log.duration_minutes,
                "calories_burned": log.calories_burned or 0.0,
                "notes": log.notes or "",
                "sets": [
                    {
                        "set_number": s.set_number,
                        "exercise_name": s.exercise.name if s.exercise else "Ejercicio",
                        "muscle_group": s.exercise.muscle_group if s.exercise else "Varios",
                        "is_bodyweight": s.exercise.is_bodyweight if s.exercise else False,
                        "weight_kg": s.weight_kg,
                        "reps_completed": s.reps_completed,
                        "volume_kg": round((s.weight_kg or 0.0) * (s.reps_completed or 0), 1),
                        "rpe": s.rpe,
                        "notes": s.notes or "",
                    }
                    for s in log.sets
                ],
            }
            data.append(workout_dict)

        content = json.dumps(data, indent=2, ensure_ascii=False)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="gymtracker_entrenamientos_{filename_date}.json"'},
        )

    # Formato CSV con BOM UTF-8 (\ufeff) para compatibilidad total con Excel
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, dialect="excel")

    writer.writerow([
        "Fecha",
        "Rutina",
        "Estado",
        "Duracion_Minutos",
        "Calorias_Quemadas_MET_Kcal",
        "Notas_Entrenamiento",
        "Ejercicio",
        "Grupo_Muscular",
        "Es_Peso_Corporal",
        "Numero_Serie",
        "Peso_Kg",
        "Repeticiones",
        "Volumen_Serie_Kg",
        "RPE",
        "Notas_Serie",
    ])

    for log in logs:
        routine_name = log.routine.name if log.routine else "Entrenamiento Libre"
        log_date = log.date.isoformat() if log.date else ""
        dur = log.duration_minutes or 0
        cal = log.calories_burned or 0.0
        log_notes = log.notes or ""

        if not log.sets:
            # Entrenamiento sin series registradas
            writer.writerow([
                log_date,
                routine_name,
                log.status,
                dur,
                cal,
                log_notes,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
            ])
        else:
            for s in log.sets:
                ex_name = s.exercise.name if s.exercise else "Desconocido"
                m_group = s.exercise.muscle_group if s.exercise else ""
                bw = "Si" if (s.exercise and s.exercise.is_bodyweight) else "No"
                vol = round((s.weight_kg or 0.0) * (s.reps_completed or 0), 1)

                writer.writerow([
                    log_date,
                    routine_name,
                    log.status,
                    dur,
                    cal,
                    log_notes,
                    ex_name,
                    m_group,
                    bw,
                    s.set_number,
                    s.weight_kg,
                    s.reps_completed,
                    vol,
                    s.rpe or "",
                    s.notes or "",
                ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="gymtracker_entrenamientos_{filename_date}.csv"'},
    )


@router.get("/nutrition")
def export_nutrition(
    format: str = Query("csv", pattern="^(csv|json)$"),
    period: str = Query("all", pattern="^(all|30d|90d|year)$"),
    start_date: Optional[dt_date] = None,
    end_date: Optional[dt_date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporta el registro nutricional y macronutrientes en CSV o JSON.
    """
    s_date, e_date = _calculate_date_filter(period, start_date, end_date)

    query = db.query(ConsumoDiario).filter(ConsumoDiario.user_id == current_user.id)

    if s_date:
        query = query.filter(ConsumoDiario.date >= s_date)
    if e_date:
        query = query.filter(ConsumoDiario.date <= e_date)

    items = query.order_by(ConsumoDiario.date.desc(), ConsumoDiario.id.desc()).all()
    filename_date = dt_date.today().isoformat()

    if format == "json":
        data = [
            {
                "id": it.id,
                "date": it.date.isoformat() if it.date else None,
                "food_name": it.food_name,
                "grams": it.grams,
                "calories": it.calories,
                "proteins": it.proteins,
                "carbs": it.carbs,
                "fats": it.fats,
                "barcode": it.barcode,
                "created_at": it.created_at.isoformat() if it.created_at else None,
            }
            for it in items
        ]
        content = json.dumps(data, indent=2, ensure_ascii=False)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="gymtracker_nutricion_{filename_date}.json"'},
        )

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, dialect="excel")

    writer.writerow([
        "Fecha",
        "Alimento",
        "Gramos",
        "Calorias_Kcal",
        "Proteinas_g",
        "Carbohidratos_g",
        "Grasas_g",
        "Codigo_Barras",
        "Fecha_Registro",
    ])

    for it in items:
        writer.writerow([
            it.date.isoformat() if it.date else "",
            it.food_name,
            it.grams,
            it.calories,
            it.proteins,
            it.carbs,
            it.fats,
            it.barcode or "",
            it.created_at.isoformat() if it.created_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="gymtracker_nutricion_{filename_date}.csv"'},
    )


@router.get("/summary")
def export_consolidated_summary(
    format: str = Query("csv", pattern="^(csv|json)$"),
    period: str = Query("all", pattern="^(all|30d|90d|year)$"),
    start_date: Optional[dt_date] = None,
    end_date: Optional[dt_date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporta un consolidado diario de métricas (calorías consumidas, quemadas, netas, macros, entrenos y tonelaje).
    """
    s_date, e_date = _calculate_date_filter(period, start_date, end_date)

    # 1. Alimentos consumidos
    nutri_query = db.query(ConsumoDiario).filter(ConsumoDiario.user_id == current_user.id)
    if s_date:
        nutri_query = nutri_query.filter(ConsumoDiario.date >= s_date)
    if e_date:
        nutri_query = nutri_query.filter(ConsumoDiario.date <= e_date)
    nutri_items = nutri_query.all()

    # 2. Entrenamientos
    workout_query = (
        db.query(WorkoutLog)
        .options(joinedload(WorkoutLog.sets))
        .filter(WorkoutLog.user_id == current_user.id)
    )
    if s_date:
        workout_query = workout_query.filter(WorkoutLog.date >= s_date)
    if e_date:
        workout_query = workout_query.filter(WorkoutLog.date <= e_date)
    workouts = workout_query.all()

    user_weight = current_user.weight_kg if (current_user.weight_kg and current_user.weight_kg > 0) else 70.0

    # Agrupar por fecha
    daily_map: Dict[dt_date, Dict[str, Any]] = {}

    for n in nutri_items:
        d = n.date
        if d not in daily_map:
            daily_map[d] = {
                "calories_consumed": 0.0,
                "proteins": 0.0,
                "carbs": 0.0,
                "fats": 0.0,
                "calories_burned": 0.0,
                "workouts_count": 0,
                "duration_minutes": 0,
                "total_volume_kg": 0.0,
                "total_sets": 0,
            }
        daily_map[d]["calories_consumed"] += n.calories or 0.0
        daily_map[d]["proteins"] += n.proteins or 0.0
        daily_map[d]["carbs"] += n.carbs or 0.0
        daily_map[d]["fats"] += n.fats or 0.0

    for w in workouts:
        d = w.date
        if d not in daily_map:
            daily_map[d] = {
                "calories_consumed": 0.0,
                "proteins": 0.0,
                "carbs": 0.0,
                "fats": 0.0,
                "calories_burned": 0.0,
                "workouts_count": 0,
                "duration_minutes": 0,
                "total_volume_kg": 0.0,
                "total_sets": 0,
            }

        daily_map[d]["workouts_count"] += 1
        daily_map[d]["duration_minutes"] += w.duration_minutes or 0

        # Gasto calórico
        if w.calories_burned and w.calories_burned > 0:
            daily_map[d]["calories_burned"] += w.calories_burned
        elif w.duration_minutes and w.duration_minutes > 0:
            daily_map[d]["calories_burned"] += 3.5 * user_weight * (w.duration_minutes / 60.0)

        # Series y volumen
        for s in w.sets:
            daily_map[d]["total_sets"] += 1
            daily_map[d]["total_volume_kg"] += (s.weight_kg or 0.0) * (s.reps_completed or 0)

    sorted_dates = sorted(daily_map.keys(), reverse=True)
    filename_date = dt_date.today().isoformat()

    if format == "json":
        data = []
        for d in sorted_dates:
            entry = daily_map[d]
            net_cal = round(entry["calories_consumed"] - entry["calories_burned"], 1)
            data.append({
                "date": d.isoformat(),
                "calories_consumed": round(entry["calories_consumed"], 1),
                "calories_burned": round(entry["calories_burned"], 1),
                "net_calories": net_cal,
                "proteins_g": round(entry["proteins"], 1),
                "carbs_g": round(entry["carbs"], 1),
                "fats_g": round(entry["fats"], 1),
                "workouts_completed": entry["workouts_count"],
                "total_duration_minutes": entry["duration_minutes"],
                "total_volume_kg": round(entry["total_volume_kg"], 1),
                "total_sets": entry["total_sets"],
            })
        content = json.dumps(data, indent=2, ensure_ascii=False)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="gymtracker_resumen_diario_{filename_date}.json"'},
        )

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, dialect="excel")

    writer.writerow([
        "Fecha",
        "Calorias_Consumidas_Kcal",
        "Calorias_Quemadas_Kcal",
        "Calorias_Netas_Kcal",
        "Proteinas_g",
        "Carbohidratos_g",
        "Grasas_g",
        "Entrenamientos_Completados",
        "Duracion_Total_Min",
        "Volumen_Total_Kg",
        "Total_Series",
    ])

    for d in sorted_dates:
        entry = daily_map[d]
        net_cal = round(entry["calories_consumed"] - entry["calories_burned"], 1)
        writer.writerow([
            d.isoformat(),
            round(entry["calories_consumed"], 1),
            round(entry["calories_burned"], 1),
            net_cal,
            round(entry["proteins"], 1),
            round(entry["carbs"], 1),
            round(entry["fats"], 1),
            entry["workouts_count"],
            entry["duration_minutes"],
            round(entry["total_volume_kg"], 1),
            entry["total_sets"],
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="gymtracker_resumen_diario_{filename_date}.csv"'},
    )


@router.get("/backup")
def export_full_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Genera un archivo JSON completo de copia de seguridad con todos los datos del usuario:
    perfil, medidas físicas, rutinas, ejercicios personalizados, entrenamientos, series y nutrición.
    """
    # 1. Perfil
    profile_data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "height_cm": current_user.height_cm,
        "weight_kg": current_user.weight_kg,
        "target_weight_kg": current_user.target_weight_kg,
        "theme_preference": current_user.theme_preference,
        "extra_data": current_user.extra_data,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

    # 2. Ejercicios personalizados
    custom_exercises = (
        db.query(Exercise)
        .filter(Exercise.user_id == current_user.id)
        .all()
    )
    exercises_data = [
        {
            "id": ex.id,
            "name": ex.name,
            "muscle_group": ex.muscle_group,
            "description": ex.description,
            "equipment": ex.equipment,
            "is_bodyweight": ex.is_bodyweight,
        }
        for ex in custom_exercises
    ]

    # 3. Rutinas
    routines = (
        db.query(Routine)
        .options(joinedload(Routine.routine_exercises).joinedload(RoutineExercise.exercise))
        .filter(Routine.user_id == current_user.id)
        .all()
    )
    routines_data = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_public": r.is_public,
            "exercises": [
                {
                    "exercise_name": rx.exercise.name if rx.exercise else "Ejercicio",
                    "muscle_group": rx.exercise.muscle_group if rx.exercise else "",
                    "sets": rx.sets,
                    "reps": rx.reps,
                    "rest_seconds": rx.rest_seconds,
                }
                for rx in r.routine_exercises
            ],
        }
        for r in routines
    ]

    # 4. Entrenamientos y series
    workout_logs = (
        db.query(WorkoutLog)
        .options(
            joinedload(WorkoutLog.routine),
            joinedload(WorkoutLog.sets).joinedload(WorkoutSet.exercise),
        )
        .filter(WorkoutLog.user_id == current_user.id)
        .order_by(WorkoutLog.date.desc())
        .all()
    )
    workouts_data = [
        {
            "id": w.id,
            "date": w.date.isoformat() if w.date else None,
            "routine_name": w.routine.name if w.routine else "Entrenamiento Libre",
            "status": w.status,
            "duration_minutes": w.duration_minutes,
            "calories_burned": w.calories_burned or 0.0,
            "notes": w.notes or "",
            "sets": [
                {
                    "set_number": s.set_number,
                    "exercise_name": s.exercise.name if s.exercise else "Ejercicio",
                    "weight_kg": s.weight_kg,
                    "reps_completed": s.reps_completed,
                    "rpe": s.rpe,
                    "notes": s.notes or "",
                }
                for s in w.sets
            ],
        }
        for w in workout_logs
    ]

    # 5. Nutrición
    nutrition_logs = (
        db.query(ConsumoDiario)
        .filter(ConsumoDiario.user_id == current_user.id)
        .order_by(ConsumoDiario.date.desc())
        .all()
    )
    nutrition_data = [
        {
            "id": n.id,
            "date": n.date.isoformat() if n.date else None,
            "food_name": n.food_name,
            "grams": n.grams,
            "calories": n.calories,
            "proteins": n.proteins,
            "carbs": n.carbs,
            "fats": n.fats,
            "barcode": n.barcode,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in nutrition_logs
    ]

    backup_payload = {
        "app": "GymTracker",
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user_profile": profile_data,
        "custom_exercises": exercises_data,
        "routines": routines_data,
        "workouts": workouts_data,
        "nutrition": nutrition_data,
    }

    filename_date = dt_date.today().isoformat()
    content = json.dumps(backup_payload, indent=2, ensure_ascii=False)
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="gymtracker_backup_completo_{filename_date}.json"'},
    )
