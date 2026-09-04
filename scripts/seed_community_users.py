import os
import sys
from dotenv import load_dotenv
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.user import User

load_dotenv()

COMMUNITY_USERS = [
    {
        'username': 'carlos_fit',
        'email': 'carlos@gym.com',
        'password': 'gympass123',
        'height_cm': 178.0,
        'weight_kg': 82.5,
        'target_weight_kg': 85.0,
    },
    {
        'username': 'valen_strong',
        'email': 'valentina@gym.com',
        'password': 'gympass123',
        'height_cm': 165.0,
        'weight_kg': 60.0,
        'target_weight_kg': 62.0,
    },
    {
        'username': 'lucas_runner',
        'email': 'lucas@gym.com',
        'password': 'gympass123',
        'height_cm': 182.0,
        'weight_kg': 74.0,
        'target_weight_kg': 73.0,
    },
    {
        'username': 'sofia_fit',
        'email': 'sofia@gym.com',
        'password': 'gympass123',
        'height_cm': 168.0,
        'weight_kg': 58.5,
        'target_weight_kg': 58.0,
    },
    {
        'username': 'mateo_lift',
        'email': 'mateo@gym.com',
        'password': 'gympass123',
        'height_cm': 175.0,
        'weight_kg': 79.0,
        'target_weight_kg': 80.0,
    }
]

def seed_community_users():
    db = SessionLocal()
    created_count = 0
    existing_count = 0

    try:
        for u_data in COMMUNITY_USERS:
            existing = db.query(User).filter(
                (User.username == u_data['username']) | (User.email == u_data['email'])
            ).first()

            if not existing:
                user = User(
                    username=u_data['username'],
                    email=u_data['email'],
                    is_admin=False,
                    theme_preference='dark',
                    height_cm=u_data.get('height_cm'),
                    weight_kg=u_data.get('weight_kg'),
                    target_weight_kg=u_data.get('target_weight_kg'),
                )
                user.set_password(u_data['password'])
                db.add(user)
                created_count += 1
                print('[CREADO] Usuario: ' + u_data['username'] + ' (' + u_data['email'] + ')')
            else:
                existing_count += 1
                print('[SKIP] Usuario ya existe: ' + u_data['username'])

        db.commit()
        print(f"\n--- Resumen: {created_count} creados, {existing_count} ya existentes. ---")
    except Exception as e:
        db.rollback()
        print('[ERROR] Error al crear usuarios: ' + str(e))
    finally:
        db.close()

if __name__ == '__main__':
    seed_community_users()
