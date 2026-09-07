"""
Modelo ConsumoDiario — Registro de consumo nutricional diario.
"""

from datetime import date, datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class ConsumoDiario(Base):
    """Registro de un alimento consumido por un usuario en una fecha determinada."""

    __tablename__ = "consumos_diarios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=lambda: date.today(), index=True)
    food_name = Column(String(200), nullable=False)
    grams = Column(Float, nullable=False, default=100.0)
    calories = Column(Float, nullable=False, default=0.0)
    proteins = Column(Float, nullable=False, default=0.0)
    carbs = Column(Float, nullable=False, default=0.0)
    fats = Column(Float, nullable=False, default=0.0)
    barcode = Column(String(64), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones ---
    user = relationship("User", back_populates="consumos_diarios")

    def __repr__(self) -> str:
        return f"<ConsumoDiario {self.food_name} ({self.grams}g) user={self.user_id}>"
