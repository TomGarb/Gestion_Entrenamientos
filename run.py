"""
run.py — Punto de entrada de la aplicación.

Crea la app Flask mediante la Application Factory, inicializa
las tablas de la base de datos, carga datos semilla si es necesario
y arranca el servidor de desarrollo en el puerto 5000.
"""

from app import create_app, db
from app.models import Exercise, User


app = create_app()


def seed_database():
    """Inserta datos iniciales si la base de datos está vacía.

    Crea un usuario por defecto y un catálogo base de ejercicios
    comunes de gimnasio. Solo se ejecuta cuando las tablas están vacías.
    """
    # ── Usuario por defecto ──
    if not User.query.first():
        user = User(username="usuario", email="usuario@gymtracker.com")
        user.set_password("1234")
        db.session.add(user)
        print(" * Usuario por defecto creado (usuario / 1234)")

    # ── Ejercicios base ──
    if not Exercise.query.first():
        exercises = [
            # Pecho
            Exercise(name="Press de Banca", muscle_group="pecho",
                     equipment="Barra y banco plano"),
            Exercise(name="Press Inclinado con Mancuernas", muscle_group="pecho",
                     equipment="Mancuernas y banco inclinado"),
            Exercise(name="Aperturas con Mancuernas", muscle_group="pecho",
                     equipment="Mancuernas y banco plano"),
            Exercise(name="Fondos en Paralelas", muscle_group="pecho",
                     equipment="Barras paralelas"),
            # Espalda
            Exercise(name="Peso Muerto", muscle_group="espalda",
                     equipment="Barra"),
            Exercise(name="Dominadas", muscle_group="espalda",
                     equipment="Barra de dominadas"),
            Exercise(name="Remo con Barra", muscle_group="espalda",
                     equipment="Barra"),
            Exercise(name="Jalón al Pecho", muscle_group="espalda",
                     equipment="Máquina de polea"),
            # Piernas
            Exercise(name="Sentadilla", muscle_group="piernas",
                     equipment="Barra y rack"),
            Exercise(name="Prensa de Piernas", muscle_group="piernas",
                     equipment="Máquina prensa"),
            Exercise(name="Extensión de Cuádriceps", muscle_group="piernas",
                     equipment="Máquina de extensión"),
            Exercise(name="Curl Femoral", muscle_group="piernas",
                     equipment="Máquina de curl"),
            # Hombros
            Exercise(name="Press Militar", muscle_group="hombros",
                     equipment="Barra"),
            Exercise(name="Elevaciones Laterales", muscle_group="hombros",
                     equipment="Mancuernas"),
            Exercise(name="Pájaros (Face Pull)", muscle_group="hombros",
                     equipment="Polea con cuerda"),
            # Brazos
            Exercise(name="Curl de Bíceps con Barra", muscle_group="brazos",
                     equipment="Barra recta o Z"),
            Exercise(name="Curl de Bíceps con Mancuernas", muscle_group="brazos",
                     equipment="Mancuernas"),
            Exercise(name="Extensión de Tríceps en Polea", muscle_group="brazos",
                     equipment="Polea alta"),
            Exercise(name="Press Francés", muscle_group="brazos",
                     equipment="Barra Z y banco"),
            # Core
            Exercise(name="Plancha", muscle_group="core",
                     equipment="Ninguno"),
            Exercise(name="Crunch Abdominal", muscle_group="core",
                     equipment="Ninguno"),
            Exercise(name="Elevación de Piernas", muscle_group="core",
                     equipment="Barra de dominadas"),
            # Cardio
            Exercise(name="Cinta de Correr", muscle_group="cardio",
                     equipment="Cinta"),
            Exercise(name="Bicicleta Estática", muscle_group="cardio",
                     equipment="Bicicleta estática"),
            Exercise(name="Remo Ergómetro", muscle_group="cardio",
                     equipment="Máquina de remo"),
        ]
        db.session.add_all(exercises)
        print(f" * {len(exercises)} ejercicios base cargados.")

    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        seed_database()
        print(" * Base de datos inicializada correctamente.")
        
    # Iniciar bot de Telegram en modo Polling (hilo separado)
    from app.services.telegram_bot import start_bot_polling
    start_bot_polling(app)

    app.run(debug=True, port=5000, use_reloader=False)
