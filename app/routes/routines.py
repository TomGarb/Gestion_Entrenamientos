"""
Blueprint Routines — Crear, listar y eliminar rutinas.

Rutas:
    GET    /routines/              → Lista las rutinas del usuario (HTML).
    POST   /routines/              → Crea una rutina con ejercicios (JSON).
    DELETE /routines/<id>          → Elimina una rutina (JSON).
"""

from flask import Blueprint, jsonify, render_template, request
from flask_login import login_required, current_user

from app import db
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise

routines_bp = Blueprint("routines", __name__, url_prefix="/routines")


# ---------------------------------------------------------------------------
# HTML — Listado
# ---------------------------------------------------------------------------

@routines_bp.route("/")
@login_required
def index():
    """Renderiza la página de rutinas del usuario.

    Pasa también la lista completa de ejercicios para el formulario
    de creación (selects dinámicos en el frontend).
    """
    routines = (
        Routine.query
        .filter_by(user_id=current_user.id)
        .order_by(Routine.updated_at.desc())
        .all()
    )
    # Ejercicios disponibles para los selects del formulario.
    exercises = Exercise.query.filter((Exercise.user_id == current_user.id) | (Exercise.user_id == None)).order_by(
        Exercise.muscle_group, Exercise.name
    ).all()

    return render_template(
        "routines.html",
        routines=routines,
        exercises=exercises,
    )


# ---------------------------------------------------------------------------
# API JSON — Crear / Eliminar
# ---------------------------------------------------------------------------

@routines_bp.route("/", methods=["POST"])
@login_required
def create():
    """Crea una rutina con sus ejercicios asociados."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify(success=False, message="Datos JSON inválidos."), 400

        name = (data.get("name") or "").strip()
        if not name:
            return jsonify(success=False, message="El nombre es obligatorio."), 400

        exercises_data = data.get("exercises", [])
        if not exercises_data:
            return jsonify(
                success=False, message="Agrega al menos un ejercicio."
            ), 400

        # Verificar que todos los exercise_id existen en la BD y pertenecen al usuario o son globales.
        exercise_ids = [e.get("exercise_id") for e in exercises_data]
        existing_ids = {
            ex.id
            for ex in Exercise.query.filter(
                Exercise.id.in_(exercise_ids),
                (Exercise.user_id == current_user.id) | (Exercise.user_id == None)
            ).all()
        }
        missing = [eid for eid in exercise_ids if eid not in existing_ids]
        if missing:
            return jsonify(
                success=False,
                message=f"Ejercicios no encontrados o sin acceso (IDs: {missing}).",
            ), 400

        # Crear la rutina.
        routine = Routine(
            name=name,
            description=(data.get("description") or "").strip(),
            user_id=current_user.id,
        )
        db.session.add(routine)
        db.session.flush()  # Obtener routine.id antes de insertar hijos.

        # Crear las entradas de RoutineExercise.
        for i, ex_data in enumerate(exercises_data):
            entry = RoutineExercise(
                routine_id=routine.id,
                exercise_id=ex_data["exercise_id"],
                sets=int(ex_data.get("sets", 3)),
                reps=int(ex_data.get("reps", 10)),
                rest_seconds=int(ex_data.get("rest_seconds", 60)),
                order_index=i,
            )
            db.session.add(entry)

        db.session.commit()

        return jsonify(
            success=True,
            message="Rutina creada correctamente.",
            routine={"id": routine.id, "name": routine.name},
        ), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify(success=False, message=f"Error del servidor: {exc}"), 500


@routines_bp.route("/<int:routine_id>", methods=["DELETE"])
@login_required
def delete(routine_id):
    """Elimina una rutina y sus RoutineExercise asociados (cascade)."""
    try:
        routine = db.session.get(Routine, routine_id)
        if not routine or routine.user_id != current_user.id:
            return jsonify(success=False, message="Rutina no encontrada o sin permiso."), 404

        db.session.delete(routine)
        db.session.commit()
        return jsonify(success=True, message="Rutina eliminada correctamente.")

    except Exception as exc:
        db.session.rollback()
        return jsonify(success=False, message=f"Error del servidor: {exc}"), 500
