"""
Blueprint Exercises — CRUD completo de ejercicios.

Rutas:
    GET  /exercises/              → Lista todos los ejercicios (HTML).
    POST /exercises/              → Crea un ejercicio personalizado (JSON).
    GET  /exercises/<id>          → Obtiene un ejercicio (JSON, para edición).
    PUT  /exercises/<id>          → Actualiza un ejercicio (JSON).
    DELETE /exercises/<id>        → Elimina un ejercicio (JSON).
"""

from flask import Blueprint, jsonify, render_template, request
from flask_login import login_required, current_user

from app import db
from app.models.exercise import MUSCLE_GROUPS, Exercise

exercises_bp = Blueprint("exercises", __name__, url_prefix="/exercises")


# ---------------------------------------------------------------------------
# HTML — Listado
# ---------------------------------------------------------------------------

@exercises_bp.route("/")
@login_required
def index():
    """Renderiza la página de ejercicios con el catálogo completo."""
    exercises = Exercise.query.filter(
        (Exercise.user_id == current_user.id) | (Exercise.user_id == None)
    ).order_by(
        Exercise.muscle_group, Exercise.name
    ).all()
    return render_template(
        "exercises.html",
        exercises=exercises,
        muscle_groups=MUSCLE_GROUPS,
    )


# ---------------------------------------------------------------------------
# API JSON — CRUD
# ---------------------------------------------------------------------------

@exercises_bp.route("/", methods=["POST"])
@login_required
def create():
    """Crea un ejercicio personalizado."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify(success=False, message="Datos JSON inválidos."), 400

        name = (data.get("name") or "").strip()
        muscle_group = data.get("muscle_group", "")

        if not name:
            return jsonify(success=False, message="El nombre es obligatorio."), 400
        if muscle_group not in MUSCLE_GROUPS:
            return jsonify(success=False, message="Grupo muscular inválido."), 400

        exercise = Exercise(
            name=name,
            muscle_group=muscle_group,
            equipment=(data.get("equipment") or "").strip(),
            description=(data.get("description") or "").strip(),
            is_custom=True,
            user_id=current_user.id,
        )
        db.session.add(exercise)
        db.session.commit()

        return jsonify(
            success=True,
            message="Ejercicio creado correctamente.",
            exercise=_serialize(exercise),
        ), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify(success=False, message=f"Error del servidor: {exc}"), 500


@exercises_bp.route("/<int:exercise_id>")
@login_required
def get_one(exercise_id):
    """Devuelve un ejercicio en formato JSON (para el form de edición)."""
    exercise = db.session.get(Exercise, exercise_id)
    if not exercise or (exercise.user_id is not None and exercise.user_id != current_user.id):
        return jsonify(success=False, message="Ejercicio no encontrado."), 404
    return jsonify(_serialize(exercise))


@exercises_bp.route("/<int:exercise_id>", methods=["PUT"])
@login_required
def update(exercise_id):
    """Actualiza los campos de un ejercicio existente."""
    try:
        exercise = db.session.get(Exercise, exercise_id)
        if not exercise or exercise.user_id != current_user.id:
            return jsonify(success=False, message="Ejercicio no encontrado o sin permiso para editarlo."), 404

        data = request.get_json(silent=True)
        if not data:
            return jsonify(success=False, message="Datos JSON inválidos."), 400

        name = (data.get("name") or "").strip()
        muscle_group = data.get("muscle_group", "")

        if not name:
            return jsonify(success=False, message="El nombre es obligatorio."), 400
        if muscle_group not in MUSCLE_GROUPS:
            return jsonify(success=False, message="Grupo muscular inválido."), 400

        exercise.name = name
        exercise.muscle_group = muscle_group
        exercise.equipment = (data.get("equipment") or "").strip()
        exercise.description = (data.get("description") or "").strip()

        db.session.commit()
        return jsonify(success=True, message="Ejercicio actualizado correctamente.")

    except Exception as exc:
        db.session.rollback()
        return jsonify(success=False, message=f"Error del servidor: {exc}"), 500


@exercises_bp.route("/<int:exercise_id>", methods=["DELETE"])
@login_required
def delete(exercise_id):
    """Elimina un ejercicio si no está asignado a ninguna rutina."""
    try:
        exercise = db.session.get(Exercise, exercise_id)
        if not exercise or exercise.user_id != current_user.id:
            return jsonify(success=False, message="Ejercicio no encontrado o sin permiso."), 404

        # Proteger ejercicios en uso dentro de rutinas activas.
        if exercise.routine_exercises.count() > 0:
            return jsonify(
                success=False,
                message="No se puede eliminar: el ejercicio está asignado a una o más rutinas.",
            ), 409

        db.session.delete(exercise)
        db.session.commit()
        return jsonify(success=True, message="Ejercicio eliminado correctamente.")

    except Exception as exc:
        db.session.rollback()
        return jsonify(success=False, message=f"Error del servidor: {exc}"), 500


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(exercise: Exercise) -> dict:
    """Convierte un modelo Exercise a diccionario JSON-serializable."""
    return {
        "id": exercise.id,
        "name": exercise.name,
        "muscle_group": exercise.muscle_group,
        "equipment": exercise.equipment,
        "description": exercise.description,
        "is_custom": exercise.is_custom,
    }
