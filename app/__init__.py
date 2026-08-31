"""
App Gimnasio — Application Factory.

Configura Flask, inicializa SQLAlchemy y registra los blueprints.
Usa el patrón Application Factory para permitir múltiples instancias
(testing, producción) y evitar imports circulares.
"""

import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Instancia global de SQLAlchemy (se vincula a la app en create_app).
db = SQLAlchemy()


def create_app(config_overrides: dict | None = None) -> Flask:
    """Crea y configura la instancia de la aplicación Flask.

    Args:
        config_overrides: Diccionario opcional para sobreescribir
            configuraciones (útil para testing).

    Returns:
        La instancia configurada de Flask.
    """
    app = Flask(__name__)

    # --- Configuración base ---------------------------------------------------
    basedir = os.path.abspath(os.path.dirname(__file__))

    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "dev-secret-key-change-in-production"
    )

    # SQLite local por defecto; en producción se usa DATABASE_URL (PostgreSQL).
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'app.db')}",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Sobreescrituras opcionales (p.ej. base de datos en memoria para tests).
    if config_overrides:
        app.config.update(config_overrides)

    # --- Extensiones ----------------------------------------------------------
    db.init_app(app)

    # --- Autenticación (Flask-Login) ------------------------------------------
    from flask_login import LoginManager
    from app.models.user import User
    
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Por favor, inicia sesión para acceder a esta página."
    login_manager.login_message_category = "error"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # --- Importar modelos para que SQLAlchemy los registre --------------------
    # noinspection PyUnresolvedReferences
    from app.models import (  # noqa: F401
        User,
        Exercise,
        Routine,
        RoutineExercise,
        WorkoutLog,
        WorkoutSet,
    )

    # --- Blueprints -----------------------------------------------------------
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.exercises import exercises_bp
    from app.routes.routines import routines_bp
    from app.routes.workouts import workouts_bp
    from app.routes.telegram_routes import telegram_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(exercises_bp)
    app.register_blueprint(routines_bp)
    app.register_blueprint(workouts_bp)
    app.register_blueprint(telegram_bp)

    return app
