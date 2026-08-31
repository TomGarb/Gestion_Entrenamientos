"""
Blueprint Telegram — Conexión web-bot.
"""
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
import random
import string

from app import db
from app.models import User

telegram_bp = Blueprint("telegram", __name__, url_prefix="/telegram")

@telegram_bp.route("/connect", methods=["GET"])
@login_required
def connect_view():
    """Vista para vincular la cuenta con Telegram."""
    return render_template("telegram/connect.html", user=current_user)


@telegram_bp.route("/generate_token", methods=["POST"])
@login_required
def generate_token():
    """Genera un nuevo token de vinculación."""
    try:
        # Generar token de 6 caracteres alfanuméricos
        token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Guardar en base de datos
        user = db.session.get(User, current_user.id)
        user.telegram_sync_token = token
        db.session.commit()
        
        return jsonify(success=True, token=token)
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, message=str(e)), 500

# ---------------------------------------------------------------------------
# Webhook (Opcional para Producción)
# ---------------------------------------------------------------------------
# Para configurar Webhooks localmente:
# 1. Ejecutar: ngrok http 5000
# 2. Tomar la URL HTTPS (ej. https://abcdef.ngrok.app)
# 3. Hacer POST a la API de Telegram:
#    https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://abcdef.ngrok.app/telegram/webhook
#
# Para este desarrollo, hemos implementado el modo Polling en run.py, que es 
# mucho más sencillo y no requiere ngrok.
# ---------------------------------------------------------------------------

@telegram_bp.route("/webhook", methods=["POST"])
def webhook():
    """Recibe las actualizaciones de Telegram (modo Webhook)."""
    # from flask import request
    # import telebot
    # from app.services.telegram_bot import bot
    #
    # if request.headers.get('content-type') == 'application/json':
    #     json_string = request.get_data().decode('utf-8')
    #     update = telebot.types.Update.de_json(json_string)
    #     bot.process_new_updates([update])
    #     return ''
    # else:
    #     return jsonify(error="Invalid content-type"), 403
    return "Webhook configurado (descomentar código interno)", 200
