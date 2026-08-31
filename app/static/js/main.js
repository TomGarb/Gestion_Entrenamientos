/**
 * main.js — Lógica global de la aplicación.
 *
 * Responsabilidades:
 *   1. Toggle de Modo Claro / Oscuro con persistencia en localStorage.
 *   2. Menú hamburguesa para navegación móvil.
 */

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initMobileMenu();
});

/* ==========================================================================
   1. THEME TOGGLE
   ========================================================================== */

/**
 * Inicializa el botón de cambio de tema.
 * Lee la preferencia guardada en localStorage o, en su defecto,
 * respeta la preferencia del sistema operativo del usuario.
 */
function initThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const STORAGE_KEY = "gymtracker-theme";
    const root = document.documentElement;

    // Restaurar tema guardado o detectar preferencia del sistema.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        root.setAttribute("data-theme", saved);
    } else {
        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }

    // Alternar tema al hacer clic.
    toggle.addEventListener("click", () => {
        const current = root.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(STORAGE_KEY, next);
    });
}

/* ==========================================================================
   2. MOBILE MENU (HAMBURGER)
   ========================================================================== */

/**
 * Inicializa el botón hamburguesa que muestra/oculta el menú
 * de navegación en pantallas pequeñas.
 */
function initMobileMenu() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        menu.classList.toggle("navbar__menu--open");
    });

    // Cerrar el menú al hacer clic en un enlace (UX móvil).
    menu.querySelectorAll(".navbar__link").forEach((link) => {
        link.addEventListener("click", () => {
            toggle.setAttribute("aria-expanded", "false");
            menu.classList.remove("navbar__menu--open");
        });
    });

    // Cerrar el menú al hacer clic fuera.
    document.addEventListener("click", (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            toggle.setAttribute("aria-expanded", "false");
            menu.classList.remove("navbar__menu--open");
        }
    });
}

/* ==========================================================================
   3. TOAST NOTIFICATIONS (global)
   ========================================================================== */

/**
 * Muestra una notificación temporal (toast) en la esquina superior derecha.
 * Esta función es global y puede usarse desde cualquier archivo JS de vista.
 *
 * @param {string} message — Texto del mensaje.
 * @param {string} [type="info"] — Tipo: "success", "error" o "info".
 * @param {number} [duration=3000] — Duración en ms antes de desaparecer.
 */
function showToast(message, type = "info", duration = 3000) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast--fade-out");
        toast.addEventListener("animationend", () => {
            toast.remove();
            if (container.childElementCount === 0) {
                container.remove();
            }
        });
    }, duration);
}
