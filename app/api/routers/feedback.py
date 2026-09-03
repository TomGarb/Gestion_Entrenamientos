import os
import smtplib
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

def send_feedback_email(user: User, message: str):
    # Variables de entorno
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_APP_PASSWORD")
    
    # Destinatario: el mismo admin por defecto
    receiver_email = os.getenv("ADMIN_EMAIL", sender_email)

    if not sender_email or not sender_password:
        print("Advertencia: Credenciales SMTP no configuradas. Guardado solo en BD.")
        return

    subject = f"Nuevo Feedback en GymTracker de {user.username}"
    body = f"Usuario: {user.username} ({user.email})\n\nMensaje:\n{message}"

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = receiver_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, msg.as_string())
        print(f"Correo de feedback enviado exitosamente de {user.username}")
    except Exception as e:
        print(f"Error enviando correo SMTP: {e}")

@router.post("", response_model=FeedbackResponse)
def submit_feedback(
    feedback_in: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Recibe el feedback, lo guarda en la base de datos y enva un correo
    electrnico de fondo al administrador.
    """
    new_feedback = Feedback(
        user_id=current_user.id,
        message=feedback_in.message,
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    # Delegar el envo del correo a un proceso de fondo para no bloquear la request
    background_tasks.add_task(send_feedback_email, current_user, feedback_in.message)

    # Convertimos a schema de respuesta (rellenando campos extra de username/email aunque no se usen aqu)
    response = FeedbackResponse(
        id=new_feedback.id,
        user_id=new_feedback.user_id,
        message=new_feedback.message,
        status=new_feedback.status,
        created_at=new_feedback.created_at,
        username=current_user.username,
        email=current_user.email
    )
    return response
