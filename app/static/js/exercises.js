/**
 * exercises.js — Lógica CRUD para la vista de Ejercicios.
 *
 * Responsabilidades:
 *   1. Toggle del formulario de creación.
 *   2. Envío del formulario de creación vía fetch (POST).
 *   3. Apertura del diálogo de edición y envío vía fetch (PUT).
 *   4. Eliminación de ejercicios vía fetch (DELETE).
 *   5. Filtrado por grupo muscular (client-side).
 */

document.addEventListener("DOMContentLoaded", () => {
    initCreateForm();
    initEditDialog();
    initDeleteButtons();
    initFilterChips();
});

/* ==========================================================================
   1. FORMULARIO DE CREACIÓN
   ========================================================================== */

function initCreateForm() {
    const toggleBtn = document.getElementById("btn-toggle-form");
    const section = document.getElementById("create-form-section");
    const cancelBtn = document.getElementById("btn-cancel-create");
    const form = document.getElementById("create-exercise-form");

    if (!toggleBtn || !section || !form) return;

    toggleBtn.addEventListener("click", () => {
        section.hidden = !section.hidden;
        if (!section.hidden) {
            document.getElementById("ex-name").focus();
        }
    });

    cancelBtn.addEventListener("click", () => {
        section.hidden = true;
        form.reset();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById("ex-name").value.trim(),
            muscle_group: document.getElementById("ex-muscle").value,
            equipment: document.getElementById("ex-equipment").value.trim(),
            description: document.getElementById("ex-description").value.trim(),
        };

        if (!data.name || !data.muscle_group) {
            showToast("Nombre y grupo muscular son obligatorios.", "error");
            return;
        }

        try {
            const res = await fetch("/exercises/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();

            if (result.success) {
                showToast(result.message, "success");
                form.reset();
                section.hidden = true;
                location.reload();
            } else {
                showToast(result.message, "error");
            }
        } catch {
            showToast("Error de conexión con el servidor.", "error");
        }
    });
}

/* ==========================================================================
   2. DIÁLOGO DE EDICIÓN
   ========================================================================== */

function initEditDialog() {
    const dialog = document.getElementById("edit-exercise-dialog");
    const form = document.getElementById("edit-exercise-form");
    const cancelBtn = document.getElementById("btn-cancel-edit");

    if (!dialog || !form) return;

    // Abrir diálogo al hacer clic en "Editar".
    document.querySelectorAll(".btn-edit-exercise").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            try {
                const res = await fetch(`/exercises/${id}`);
                if (!res.ok) throw new Error("Not found");
                const exercise = await res.json();

                document.getElementById("edit-ex-id").value = exercise.id;
                document.getElementById("edit-ex-name").value = exercise.name;
                document.getElementById("edit-ex-muscle").value = exercise.muscle_group;
                document.getElementById("edit-ex-equipment").value = exercise.equipment || "";
                document.getElementById("edit-ex-description").value = exercise.description || "";

                dialog.showModal();
            } catch {
                showToast("Error al cargar el ejercicio.", "error");
            }
        });
    });

    // Cancelar edición.
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => dialog.close());
    }

    // Cerrar al clic en el backdrop.
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
    });

    // Enviar edición.
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("edit-ex-id").value;
        const data = {
            name: document.getElementById("edit-ex-name").value.trim(),
            muscle_group: document.getElementById("edit-ex-muscle").value,
            equipment: document.getElementById("edit-ex-equipment").value.trim(),
            description: document.getElementById("edit-ex-description").value.trim(),
        };

        if (!data.name || !data.muscle_group) {
            showToast("Nombre y grupo muscular son obligatorios.", "error");
            return;
        }

        try {
            const res = await fetch(`/exercises/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();

            if (result.success) {
                showToast(result.message, "success");
                dialog.close();
                location.reload();
            } else {
                showToast(result.message, "error");
            }
        } catch {
            showToast("Error de conexión con el servidor.", "error");
        }
    });
}

/* ==========================================================================
   3. ELIMINACIÓN
   ========================================================================== */

function initDeleteButtons() {
    document.querySelectorAll(".btn-delete-exercise").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const card = btn.closest(".exercise-card");
            const name = card.querySelector(".card__title").textContent.trim();

            if (!confirm(`¿Eliminar el ejercicio "${name}"?`)) return;

            try {
                const res = await fetch(`/exercises/${id}`, { method: "DELETE" });
                const result = await res.json();

                if (result.success) {
                    showToast(result.message, "success");
                    card.remove();

                    // Mostrar estado vacío si no quedan tarjetas.
                    const grid = document.getElementById("exercises-grid");
                    if (!grid.querySelector(".exercise-card")) {
                        grid.innerHTML =
                            '<div class="empty-state"><p class="empty-state__text">No hay ejercicios. ¡Crea el primero!</p></div>';
                    }
                } else {
                    showToast(result.message, "error");
                }
            } catch {
                showToast("Error de conexión con el servidor.", "error");
            }
        });
    });
}

/* ==========================================================================
   4. FILTRO POR GRUPO MUSCULAR
   ========================================================================== */

function initFilterChips() {
    const chips = document.querySelectorAll(".filter-chip");
    const cards = document.querySelectorAll(".exercise-card");

    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const filter = chip.dataset.filter;

            // Actualizar estado activo.
            chips.forEach((c) => c.classList.remove("filter-chip--active"));
            chip.classList.add("filter-chip--active");

            // Filtrar tarjetas.
            cards.forEach((card) => {
                card.style.display =
                    filter === "todos" || card.dataset.muscle === filter
                        ? ""
                        : "none";
            });
        });
    });
}
