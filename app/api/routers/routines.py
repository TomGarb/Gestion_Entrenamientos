from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.routine import Routine, RoutineExercise
from app.schemas.routine import RoutineCreate, RoutineResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/routines", tags=["routines"])

@router.get("/", response_model=List[RoutineResponse])
def get_routines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Cargamos la rutina, sus items de ejercicio, y la info del ejercicio final para evitar N+1
    routines = db.query(Routine)\
        .filter(Routine.user_id == current_user.id)\
        .options(
            joinedload(Routine.routine_exercises)
            .joinedload(RoutineExercise.exercise)
        )\
        .all()
    return routines

@router.post("/", response_model=RoutineResponse)
def create_routine(routine_in: RoutineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # 1. Crear Rutina Principal
        new_routine = Routine(
            name=routine_in.name,
            description=routine_in.description,
            is_public=routine_in.is_public,
            user_id=current_user.id
        )
        db.add(new_routine)
        db.flush() # Obtenemos el ID generado de new_routine antes de hacer commit completo
        
        # 2. Iterar y crear RoutineExercises vinculados
        for index, ex_in in enumerate(routine_in.exercises):
            new_re = RoutineExercise(
                routine_id=new_routine.id,
                exercise_id=ex_in.exercise_id,
                sets=ex_in.sets,
                reps=ex_in.reps,
                rest_seconds=ex_in.rest_seconds,
                order_index=index
            )
            db.add(new_re)
            
        db.commit()
        db.refresh(new_routine)
        
        # Opcional: hacer un query explícito con joinedload para asegurar que los datos nested están listos para la respuesta
        db_routine = db.query(Routine)\
            .filter(Routine.id == new_routine.id)\
            .options(
                joinedload(Routine.routine_exercises)
                .joinedload(RoutineExercise.exercise)
            )\
            .first()
            
        return db_routine
        
    except Exception as e:
        db.rollback() # Prevenir base de datos corrupta/a medias si falla algo
        print(f"Error creating routine: {e}")
        raise HTTPException(status_code=500, detail="Error al crear la rutina de forma transaccional")

@router.delete("/{routine_id}")
def delete_routine(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no autorizada")
    
    db.delete(db_routine)
    db.commit()
    return {"detail": "Rutina eliminada exitosamente"}

import secrets

@router.post("/{routine_id}/share")
def share_routine(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada o no autorizada")
    
    if not db_routine.share_hash:
        # Generate unique hash
        while True:
            new_hash = secrets.token_urlsafe(6)
            if not db.query(Routine).filter(Routine.share_hash == new_hash).first():
                db_routine.share_hash = new_hash
                break
        db.commit()
        db.refresh(db_routine)
        
    return {"share_hash": db_routine.share_hash}


@router.get("/shared/{hash}", response_model=RoutineResponse)
def get_shared_routine(hash: str, db: Session = Depends(get_db)):
    db_routine = db.query(Routine)\
        .filter(Routine.share_hash == hash)\
        .options(
            joinedload(Routine.routine_exercises)
            .joinedload(RoutineExercise.exercise),
            joinedload(Routine.author)
        )\
        .first()
        
    if not db_routine:
        raise HTTPException(status_code=404, detail="Rutina compartida no encontrada")
    
    # We populate author_name dynamically
    response_obj = RoutineResponse.model_validate(db_routine)
    response_obj.author_name = db_routine.author.username if db_routine.author else "Usuario Anónimo"
    return response_obj


@router.post("/shared/{hash}/clone", response_model=RoutineResponse)
def clone_shared_routine(hash: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch original routine
    original_routine = db.query(Routine)\
        .filter(Routine.share_hash == hash)\
        .options(joinedload(Routine.routine_exercises))\
        .first()
        
    if not original_routine:
        raise HTTPException(status_code=404, detail="Rutina compartida no encontrada")
        
    # Prevent cloning own routine
    if original_routine.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes clonar tu propia rutina")

    try:
        # 2. Duplicate routine
        new_routine = Routine(
            name=f"{original_routine.name} (Clonada)",
            description=original_routine.description,
            is_public=False,
            user_id=current_user.id
        )
        db.add(new_routine)
        db.flush()
        
        # 3. Duplicate routine exercises
        for orig_ex in original_routine.routine_exercises:
            new_re = RoutineExercise(
                routine_id=new_routine.id,
                exercise_id=orig_ex.exercise_id,
                sets=orig_ex.sets,
                reps=orig_ex.reps,
                rest_seconds=orig_ex.rest_seconds,
                order_index=orig_ex.order_index
            )
            db.add(new_re)
            
        db.commit()
        db.refresh(new_routine)
        
        # Load relations for response
        db_routine = db.query(Routine)\
            .filter(Routine.id == new_routine.id)\
            .options(
                joinedload(Routine.routine_exercises)
                .joinedload(RoutineExercise.exercise)
            )\
            .first()
            
        return db_routine
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al clonar la rutina")
