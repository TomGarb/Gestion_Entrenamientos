# GymTracker 🏋️‍♂️ (v3.0 — Community & Collaborative Edition)

GymTracker es una plataforma completa y moderna para la gestión, seguimiento y programación colaborativa de entrenamientos de gimnasio. Diseñada con una estética analítica profunda (Dark Mode Fintech/Glassmorphism), GymTracker combina un **Frontend React**, una **API RESTful y WebSockets en FastAPI** y base de datos relacional (**PostgreSQL / SQLite**), integrada con un bot de **Telegram**.

---

## 🚀 Acceso a la Aplicación

Puedes acceder a la plataforma web en cualquier momento a través del siguiente enlace:
👉 **[gym-tracker-app-murex.vercel.app](https://gym-tracker-app-murex.vercel.app/)**

---

## ✨ Novedades de la Versión 3.0

### 👥 1. Red Social y Comunidad (`/community`)
* **Búsqueda Segura de Atletas:** Búsqueda precisa por nombre de usuario o email con privacidad cuidada.
* **Sistema de Amistades Bidireccional:** Envío, recepción, cancelación y aceptación/rechazo de solicitudes de amistad.
* **Grupos de Entrenamiento (Workout Groups):**
  * Creación de grupos públicos y privados protegidos con código de acceso único de 6 caracteres.
  * Muro de actividad y feed grupal en tiempo real con las últimas sesiones de los integrantes.
  * Roles de administración y miembros dentro de los grupos.

### 📅 2. Programación Colaborativa y Calendario (`/calendar`)
* **Calendario Mensual Interactivo:** Vista gráfica con marcadores de entrenamientos agendados (verde) e invitaciones pendientes (naranja).
* **Citas de Entrenamiento entre Amigos:**
  * Cita a cualquier amigo de tu lista para entrenar una rutina específica en una fecha pactada.
* **Lógica de Clonado Automático:**
  * Al hacer clic en **"Aceptar"**, la rutina del compañero se clona íntegramente en tu propia biblioteca (con todos sus ejercicios, series y repeticiones) y se agenda en tu calendario.
  * El anfitrión recibe una confirmación instantánea.
* **Inicio Rápido de Sesión:** Lanza el registro del entrenamiento directamente desde el calendario con un solo clic.

### 🔔 3. Notificaciones en Tiempo Real (WebSockets + Telegram)
* **WebSockets Bidireccionales:** Notificaciones emergentes instantáneas para solicitudes de amistad, invitaciones a entrenar y confirmaciones.
* **Dropdown Interactivo:** Botones directos de **✓ Aceptar** y **✕ Rechazar** dentro de la campana de notificaciones.
* **Sincronización con Telegram:** Notificaciones con botones interactivos (*Inline Keyboards*) para aceptar o rechazar solicitudes de amistad y citas de entrenamiento directamente desde Telegram.

### 📊 4. Analíticas Avanzadas y Métricas
* **Mapa de Calor de Consistencia:** Visualización estilo GitHub de los últimos 120 días de entrenamiento.
* **Distribución de Volumen Muscular:** Gráficos de torta interactivos (Recharts) que desglosan el tonelaje por grupo muscular.
* **Progresión de Fuerza:** Gráficos lineales históricos de peso máximo y 1RM por ejercicio.
* **Muro de Actividad en el Dashboard:** Feed rápido del entrenamiento más reciente de cada miembro de tus grupos.

### 🛡️ 5. Panel de Administración y Feedback
* **Panel de Control `/admin`:** Gestión de usuarios registrados y auditoría.
* **Sistema de Feedback Integrado:** Modal flotante para enviar reportes de errores y sugerencias directamente al equipo.

---

## 📱 Cómo Instalarla en tu Celular (PWA)

GymTracker está diseñada como una **Aplicación Web Progresiva (PWA)** para funcionar a pantalla completa con rendimiento nativo:

**En iPhone (iOS):**
1. Abre el enlace en **Safari**.
2. Toca el ícono de **Compartir** (cuadro con flecha hacia arriba).
3. Selecciona **"Agregar a inicio"** (Add to Home Screen).
4. Confirma tocando **Agregar**.

**En Android:**
1. Abre el enlace en **Google Chrome**.
2. Toca el banner inferior **"Instalar aplicación"** o el menú de 3 puntos (arriba a la derecha).
3. Selecciona **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.

---

## 🤖 El Bot de Telegram (Compañero de Entrenamiento)

La App Web es ideal para planificar tus semanas y revisar analíticas. El Bot de Telegram es perfecto para registrar tus series mientras entrenas de forma rápida, con una sola mano y sin preocuparte por la conexión.

**¿Cómo vincularlo?**
1. Inicia sesión en la App Web y dirígete a **Configuración** o presiona **Telegram** en cualquier rutina.
2. Genera tu código de vinculación de 6 dígitos.
3. En Telegram, abre el bot y envía `/vincular TU_CODIGO` (o envía el código directamente).
4. ¡Listo! Puedes enviar rutinas al bot, registrar series enviando `<peso> <reps>` (ej: `80 10`) y responder invitaciones con los botones interactivos.

---

## 🛠️ Tecnologías y Arquitectura

* **Frontend:** React 18, Vite, React Router DOM, Recharts, React-Calendar, Context API, Pure CSS (Tema Dark Glassmorphism).
* **Backend:** FastAPI (Python 3.12), SQLAlchemy ORM, WebSockets, Pydantic v2, Python-Jose (JWT), Bcrypt.
* **Base de Datos:** PostgreSQL (Neon Serverless) / SQLite (entorno local y tests).
* **Despliegue:** Vercel (Frontend SPA) y Render / VPS (Backend FastAPI con soporte WebSocket).
* **Integraciones:** Telegram Bot API (Webhooks & Polling).

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite de pruebas del backend:
```bash
python -m unittest discover tests/
```

Para verificar la compilación del frontend:
```bash
cd frontend
npm run build
```

---
*Versión 3.0 — GymTracker Team*
