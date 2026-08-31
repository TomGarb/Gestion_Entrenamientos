from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import user, exercise, routine, workout

Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="GymTracker API",
    description="API RESTful para la gestión de entrenamientos de gimnasio",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",  # Puerto por defecto de Vite (React)
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permite todos los headers
)

# Ruta base de prueba
@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de GymTracker. El servidor FastAPI está funcionando."}

from app.api.routers import auth, exercises, routines, workouts, dashboard, telegram

app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(routines.router)
app.include_router(workouts.router)
app.include_router(dashboard.router)
app.include_router(telegram.router)

if __name__ == "__main__":
    import uvicorn
    # Para arrancar el servidor en desarrollo local
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
