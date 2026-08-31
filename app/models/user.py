"""
Modelo User — Gestión de cuentas de usuario.

Almacena credenciales (hash seguro), preferencia de tema y
relaciones con rutinas, ejercicios personalizados y entrenamientos.
"""

from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash
from flask_login import UserMixin

from app import db


class User(db.Model, UserMixin):
    """Representa un usuario registrado en la aplicación."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(
        db.String(80), unique=True, nullable=False, index=True
    )
    email = db.Column(
        db.String(120), unique=True, nullable=False, index=True
    )
    password_hash = db.Column(db.String(256), nullable=False)
    theme_preference = db.Column(
        db.String(10), default="dark", nullable=False
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    telegram_chat_id = db.Column(db.String(64), unique=True, nullable=True)
    telegram_sync_token = db.Column(db.String(6), unique=True, nullable=True)

    # --- Relaciones -----------------------------------------------------------
    routines = db.relationship(
        "Routine",
        backref="author",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    custom_exercises = db.relationship(
        "Exercise",
        backref="creator",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    workout_logs = db.relationship(
        "WorkoutLog",
        backref="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    # --- Métodos de contraseña ------------------------------------------------

    def set_password(self, password: str) -> None:
        """Genera y almacena el hash de la contraseña.

        Args:
            password: Contraseña en texto plano.
        """
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifica una contraseña contra el hash almacenado.

        Args:
            password: Contraseña en texto plano a verificar.

        Returns:
            True si la contraseña coincide, False en caso contrario.
        """
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f"<User {self.username}>"
