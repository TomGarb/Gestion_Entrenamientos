"""
Blueprint Auth — Rutas de autenticación.
"""
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from urllib.parse import urlsplit

from app import db
from app.models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """Registro de nuevo usuario."""
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        
        # Validaciones
        if not username or not email or not password:
            flash("Todos los campos son obligatorios.", "error")
            return redirect(url_for("auth.register"))
            
        if User.query.filter_by(email=email).first():
            flash("El correo electrónico ya está registrado.", "error")
            return redirect(url_for("auth.register"))
            
        if User.query.filter_by(username=username).first():
            flash("El nombre de usuario ya está en uso.", "error")
            return redirect(url_for("auth.register"))
            
        user = User(username=username, email=email)
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            flash("Cuenta creada con éxito. Por favor inicia sesión.", "success")
            return redirect(url_for("auth.login"))
        except Exception as e:
            db.session.rollback()
            flash("Hubo un error al registrar el usuario.", "error")
            return redirect(url_for("auth.register"))

    return render_template("auth/register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """Inicio de sesión."""
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        
        user = User.query.filter_by(email=email).first()
        
        if user is None or not user.check_password(password):
            flash("Correo electrónico o contraseña inválidos.", "error")
            return redirect(url_for("auth.login"))
            
        login_user(user, remember=True)
        
        # Redirigir a la página previa si existe, sino al dashboard
        next_page = request.args.get("next")
        if not next_page or urlsplit(next_page).netloc != "":
            next_page = url_for("dashboard.index")
            
        flash(f"¡Bienvenido de nuevo, {user.username}!", "success")
        return redirect(next_page)

    return render_template("auth/login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    """Cerrar sesión."""
    logout_user()
    flash("Has cerrado sesión exitosamente.", "info")
    return redirect(url_for("auth.login"))
