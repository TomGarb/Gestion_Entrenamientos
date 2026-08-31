/**
 * routines.js — Lógica para la vista de Rutinas.
 *
 * Responsabilidades:
 *   1. Toggle del formulario de creación.
 *   2. Agregar/quitar filas dinámicas de ejercicios al formulario.
 *   3. Envío del formulario vía fetch (POST) con datos JSON.
 *   4. Eliminación de rutinas vía fetch (DELETE).
 */

document.addEventListener("DOMContentLoaded", () => {
    initRoutineForm();
    initDeleteButtons();
});

/* ==========================================================================
   1. FORMULARIO DE CREACIÓN CON EJERCICIOS DINÁMICOS
   ========================================================================== */

function initRoutineForm() {
    const toggleBtn = document.getElementById("btn-toggle-routine-form");
    const section = document.getElementById("create-routine-section");
    const cancelBtn = document.getElementById("btn-cancel-routine");
    const form = document.getElementById("create-routine-form");
    const addExBtn = document.getElementById("btn-add-exercise");
    const exercisesList = document.getElementById("routine-exercises-list");

    if (!toggleBtn || !section || !form) return;

    let exerciseCounter = 0;

    // ── Toggle formulario ──
    toggleBtn.addEventListener("click", () => {
        section.hidden = !section.hidden;
        if (!section.hidden) {
            document.getElementById("routine-name").focus();
            // Agregar una fila inicial si la lista está vacía.
            if (exercisesList.children.length === 0) {
                exerciseCounter++;
                addExerciseRow(exerciseCounter);
            }
        }
    });

    cancelBtn.addEventListener("click", () => {
        section.hidden = true;
        form.reset();
        exercisesList.innerHTML = "";
        exerciseCounter = 0;
    });

    // ── Agregar fila de ejercicio ──
    addExBtn.addEventListener("click", () => {
        exerciseCounter++;
        addExerciseRow(exerciseCounter);
    });

    // ── Quitar fila de ejercicio (delegación de eventos) ──
    exercisesList.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".btn-remove-exercise");
        if (removeBtn) {
            removeBtn.closest(".routine-exercise-row").remove();
            renumberRows();
        }
    });

    // ── Enviar formulario ──
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("routine-name").value.trim();
        const description = document.getElementById("routine-description").value.trim();

        if (!name) {
            showToast("El nombre de la rutina es obligatorio.", "error");
            return;
        }

        // Recolectar ejercicios de las filas dinámicas.
        const rows = exercisesList.querySelectorAll(".routine-exercise-row");
        if (rows.length === 0) {
            showToast("Agrega al menos un ejercicio a la rutina.", "error");
            return;
        }

        const exercises = [];
        let valid = true;

        rows.forEach((row) => {
            const exerciseId = row.querySelector(".re-exercise-select").value;
            const sets = row.querySelector(".re-sets").value;
            const reps = row.querySelector(".re-reps").value;
            const rest = row.querySelector(".re-rest").value;

            if (!exerciseId) {
                valid = false;
                return;
            }

            exercises.push({
                exercise_id: parseInt(exerciseId, 10),
                sets: parseInt(sets, 10) || 3,
                reps: parseInt(reps, 10) || 10,
                rest_seconds: parseInt(rest, 10) || 60,
            });
        });

        if (!valid) {
            showToast("Selecciona un ejercicio en todas las filas.", "error");
            return;
        }

        try {
            const res = await fetch("/routines/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, exercises }),
            });
            const result = await res.json();

            if (result.success) {
                showToast(result.message, "success");
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
   2. AGREGAR FILA DE EJERCICIO
   ========================================================================== */

/**
 * Crea una nueva fila con select de ejercicio + inputs de series/reps/descanso.
 *
 * @param {number} index — Número visible de la fila.
 */
function addExerciseRow(index) {
    const list = document.getElementById("routine-exercises-list");
    const source = document.getElementById("exercise-options-source");
    const options = source ? source.innerHTML : "";

    const row = document.createElement("div");
    row.className = "routine-exercise-row";
    row.innerHTML = `
        <div class="re-row-number">${index}</div>
        <div class="re-fields">
            <div class="form-group re-field-exercise">
                <select class="form-select re-exercise-select" required>
                    <option value="">Seleccionar ejercicio…</option>
                    ${options}
                </select>
            </div>
            <div class="form-group re-field-num">
                <label class="form-label--inline">Series</label>
                <input class="form-input re-sets" type="number" min="1" max="20" value="3">
            </div>
            <div class="form-group re-field-num">
                <label class="form-label--inline">Reps</label>
                <input class="form-input re-reps" type="number" min="1" max="100" value="10">
            </div>
            <div class="form-group re-field-num">
                <label class="form-label--inline">Descanso (s)</label>
                <input class="form-input re-rest" type="number" min="0" max="600" value="60">
            </div>
        </div>
        <button type="button" class="btn btn--sm btn--danger-outline btn-remove-exercise"
                title="Quitar ejercicio">&times;</button>
    `;

    list.appendChild(row);
}

/**
 * Renumera visualmente las filas tras eliminar una.
 */
function renumberRows() {
    const rows = document.querySelectorAll(".routine-exercise-row");
    rows.forEach((row, i) => {
        row.querySelector(".re-row-number").textContent = i + 1;
    });
}

/* ==========================================================================
   3. ELIMINACIÓN DE RUTINAS
   ========================================================================== */

function initDeleteButtons() {
    document.querySelectorAll(".btn-delete-routine").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const card = btn.closest(".routine-card");
            const name = card.querySelector(".card__title").textContent.trim();

            if (!confirm(`¿Eliminar la rutina "${name}"?`)) return;

            try {
                const res = await fetch(`/routines/${id}`, { method: "DELETE" });
                const result = await res.json();

                if (result.success) {
                    showToast(result.message, "success");
                    card.remove();

                    const grid = document.getElementById("routines-grid");
                    if (!grid.querySelector(".routine-card")) {
                        grid.innerHTML =
                            '<div class="empty-state"><p class="empty-state__text">No hay rutinas. ¡Crea la primera!</p></div>';
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
