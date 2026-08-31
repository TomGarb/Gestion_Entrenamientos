from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/exercises", tags=["exercises"])

@router.get("/", response_model=List[ExerciseResponse])
def get_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Retorna ejercicios del sistema (user_id = None) y los personalizados del usuario
    exercises = db.query(Exercise).filter(
        (Exercise.user_id == current_user.id) | (Exercise.user_id == None)
    ).all()
    return exercises

@router.post("/", response_model=ExerciseResponse)
def create_exercise(exercise: ExerciseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_exercise = Exercise(
        name=exercise.name,
        muscle_group=exercise.muscle_group,
        description=exercise.description,
        equipment=exercise.equipment,
        is_custom=True,
        user_id=current_user.id
    )
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise

@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(exercise_id: int, exercise_data: ExerciseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.user_id == current_user.id).first()
    if not db_exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado o no tienes permiso para editarlo")
    
    db_exercise.name = exercise_data.name
    db_exercise.muscle_group = exercise_data.muscle_group
    db_exercise.description = exercise_data.description
    db_exercise.equipment = exercise_data.equipment
    
    db.commit()
    db.refresh(db_exercise)
    return db_exercise

@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.user_id == current_user.id).first()
    if not db_exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado o no tienes permiso para eliminarlo")
    
    db.delete(db_exercise)
    db.commit()
    return {"detail": "Ejercicio eliminado exitosamente"}
