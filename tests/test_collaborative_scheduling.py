import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.scheduled_workout import ScheduledWorkout
from app.models.notification import Notification
from app.models.friendship import Friendship
from app.core.security import create_access_token
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestCollaborativeWorkoutScheduling(unittest.TestCase):

    def setUp(self):
        Base.metadata.create_all(bind=engine)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_collaborative_workout_scheduling_flow(self):
        db = TestingSessionLocal()

        # 1. Crear Usuario A (Tomas) y Usuario B (Marcos)
        user_a = User(username="tomas", email="tomas@test.com", password_hash="hashA")
        user_b = User(username="marcos", email="marcos@test.com", password_hash="hashB")
        db.add_all([user_a, user_b])
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)

        # 2. Establecer amistad
        friendship = Friendship(user_id=user_a.id, friend_id=user_b.id, status="accepted")
        db.add(friendship)

        # 3. Crear ejercicio y rutina para Tomas
        ex1 = Exercise(name="Press de Banca", muscle_group="Pecho", is_custom=False)
        ex2 = Exercise(name="Aperturas con Mancuerna", muscle_group="Pecho", is_custom=False)
        db.add_all([ex1, ex2])
        db.commit()
        db.refresh(ex1)
        db.refresh(ex2)

        routine_a = Routine(name="Push Day", description="Día pesado de empuje", user_id=user_a.id, is_public=False)
        db.add(routine_a)
        db.flush()

        re1 = RoutineExercise(routine_id=routine_a.id, exercise_id=ex1.id, sets=4, reps=8, rest_seconds=90, order_index=0)
        re2 = RoutineExercise(routine_id=routine_a.id, exercise_id=ex2.id, sets=3, reps=12, rest_seconds=60, order_index=1)
        db.add_all([re1, re2])
        db.commit()
        db.refresh(routine_a)

        # Tokens JWT
        token_a = create_access_token({"sub": user_a.email, "id": user_a.id})
        token_b = create_access_token({"sub": user_b.email, "id": user_b.id})

        # 4. Usuario A invita a Usuario B a entrenar Push Day
        target_date = (date.today() + timedelta(days=3)).isoformat()
        invite_payload = {
            "friend_id": user_b.id,
            "routine_id": routine_a.id,
            "scheduled_date": target_date,
            "notes": "¡Vamos a meter récord en banca!",
            "schedule_for_me": True
        }

        resp_invite = client.post(
            "/api/scheduled-workouts/invite",
            json=invite_payload,
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(resp_invite.status_code, 200, resp_invite.text)
        invited_workout_data = resp_invite.json()
        self.assertEqual(invited_workout_data["status"], "pending")
        self.assertEqual(invited_workout_data["invited_by_id"], user_a.id)
        self.assertEqual(invited_workout_data["user_id"], user_b.id)
        b_workout_id = invited_workout_data["id"]

        # Verificar que Usuario A también tiene su sesión agendada
        host_schedule = db.query(ScheduledWorkout).filter(
            ScheduledWorkout.user_id == user_a.id,
            ScheduledWorkout.routine_id == routine_a.id
        ).first()
        self.assertIsNotNone(host_schedule)
        self.assertEqual(host_schedule.status, "scheduled")

        # Verificar que Usuario B recibió la notificación in-app
        notif_b = db.query(Notification).filter(
            Notification.user_id == user_b.id,
            Notification.type == "workout_invitation"
        ).first()
        self.assertIsNotNone(notif_b)
        self.assertIn("@tomas te invitó a entrenar Push Day", notif_b.message)
        self.assertEqual(notif_b.reference_id, b_workout_id)

        # 5. Usuario B acepta la invitación
        resp_accept = client.post(
            f"/api/scheduled-workouts/{b_workout_id}/accept",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        self.assertEqual(resp_accept.status_code, 200, resp_accept.text)
        accepted_data = resp_accept.json()
        self.assertIn(accepted_data["status"], ["scheduled", "accepted"])

        # 6. Verificar que la rutina se clonó para Usuario B
        cloned_routine = db.query(Routine).filter(
            Routine.user_id == user_b.id,
            Routine.name == "Push Day"
        ).first()
        self.assertIsNotNone(cloned_routine)
        self.assertNotEqual(cloned_routine.id, routine_a.id)
        self.assertEqual(len(cloned_routine.routine_exercises), 2)

        # Verificar que el ScheduledWorkout de B ahora apunta a su rutina clonada
        updated_b_sw = db.query(ScheduledWorkout).filter(ScheduledWorkout.id == b_workout_id).first()
        self.assertEqual(updated_b_sw.routine_id, cloned_routine.id)
        self.assertEqual(updated_b_sw.status, "scheduled")

        # 7. Verificar que Usuario A recibió la notificación de confirmación
        notif_a = db.query(Notification).filter(
            Notification.user_id == user_a.id,
            Notification.type == "workout_invitation_accepted"
        ).first()
        self.assertIsNotNone(notif_a)
        self.assertIn("@marcos aceptó tu invitación", notif_a.message)

        # 8. Test de rechazo de invitación
        target_date_2 = (date.today() + timedelta(days=5)).isoformat()
        invite_2 = client.post(
            "/api/scheduled-workouts/invite",
            json={
                "friend_id": user_a.id,
                "routine_id": cloned_routine.id,
                "scheduled_date": target_date_2,
                "notes": "¿Entrenamos de nuevo el sábado?",
                "schedule_for_me": True
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        self.assertEqual(invite_2.status_code, 200)
        sw_2_id = invite_2.json()["id"]

        resp_reject = client.post(
            f"/api/scheduled-workouts/{sw_2_id}/reject",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(resp_reject.status_code, 200)

        # Verificar notificación de rechazo para B
        notif_reject = db.query(Notification).filter(
            Notification.user_id == user_b.id,
            Notification.type == "workout_invitation_rejected"
        ).first()
        self.assertIsNotNone(notif_reject)

        db.close()


if __name__ == "__main__":
    unittest.main()
