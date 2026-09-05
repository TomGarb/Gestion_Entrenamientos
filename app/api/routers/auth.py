from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, UserUpdate, UserPasswordUpdate
from app.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.api.deps import get_current_user

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import uuid
from pydantic import BaseModel

from sqlalchemy.exc import IntegrityError

class GoogleAuth(BaseModel):
    token: str

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    clean_username = user.username.strip()
    clean_email = user.email.strip().lower()

    if db.query(User).filter(User.username.ilike(clean_username)).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso. Por favor elige otro.")
        
    if db.query(User).filter(User.email.ilike(clean_email)).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
    
    height = user.altura if user.altura is not None else user.height_cm
    weight = user.peso if user.peso is not None else user.weight_kg

    new_user = User(
        username=clean_username,
        email=clean_email,
        height_cm=height,
        weight_kg=weight,
        foto_perfil=user.foto_perfil
    )
    new_user.set_password(user.password)
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El nombre de usuario o correo ya está en uso.")
        
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Permitir login con username o email
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    is_valid = user.check_password(form_data.password)
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (o tu contraseña expiro en la migración, por favor crea una nueva cuenta)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "id": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_update.username is not None and user_update.username.strip():
        new_username = user_update.username.strip()
        # Check if username is taken by another user
        existing = db.query(User).filter(User.username.ilike(new_username), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
        current_user.username = new_username
    
    if user_update.email is not None and str(user_update.email).strip():
        new_email = str(user_update.email).strip().lower()
        existing_email = db.query(User).filter(User.email.ilike(new_email), User.id != current_user.id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        current_user.email = new_email

    if user_update.altura is not None:
        current_user.height_cm = user_update.altura
    elif user_update.height_cm is not None:
        current_user.height_cm = user_update.height_cm

    if user_update.peso is not None:
        current_user.weight_kg = user_update.peso
    elif user_update.weight_kg is not None:
        current_user.weight_kg = user_update.weight_kg

    if user_update.target_weight_kg is not None:
        current_user.target_weight_kg = user_update.target_weight_kg
    if user_update.foto_perfil is not None:
        current_user.foto_perfil = user_update.foto_perfil
    if user_update.share_calendar_with_friends is not None:
        current_user.share_calendar_with_friends = user_update.share_calendar_with_friends
        
    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El nombre de usuario o correo ya está en uso.")
        
    return current_user

@router.put("/me/password")
def update_password(pass_update: UserPasswordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.check_password(pass_update.current_password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
        
    current_user.set_password(pass_update.new_password)
    db.commit()
    return {"status": "success", "message": "Contraseña actualizada"}

@router.post("/google", response_model=Token)
def google_auth(google_data: GoogleAuth, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google Auth no está configurado en el servidor")
        
    try:
        idinfo = id_token.verify_oauth2_token(
            google_data.token, 
            google_requests.Request(), 
            client_id
        )
        email = idinfo['email']
        name = idinfo.get('given_name', email.split('@')[0])
        picture = idinfo.get('picture')
    except ValueError:
        raise HTTPException(status_code=400, detail="Token de Google inválido")
        
    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        # Create a new user with random password
        base_username = name.lower().replace(" ", "")
        username = base_username
        if db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{str(uuid.uuid4())[:6]}"
            
        user = User(
            username=username,
            email=email,
            foto_perfil=picture
        )
        user.set_password(str(uuid.uuid4()))  # Contraseña aleatoria
        db.add(user)
        db.commit()
        db.refresh(user)
    elif picture and not user.foto_perfil:
        user.foto_perfil = picture
        db.commit()
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "id": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
