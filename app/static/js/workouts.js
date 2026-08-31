document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("workout-form");
    if (!form) return;

    const dateInput = document.getElementById("workout-date");
    const routineSelect = document.getElementById("routine-select");
    const container = document.getElementById("workout-exercises");
    const btnAddEx = document.getElementById("btn-add-exercise-block");
    const sourceSelect = document.getElementById("source-exercise-select");
    const routinesDataStr = document.getElementById("source-routines-data").textContent;
    const routinesData = JSON.parse(routinesDataStr);

    let exerciseCount = 0;

    // Set today's date
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];

    // Listen to routine change
    routineSelect.addEventListener("change", (e) => {
        const routineId = e.target.value;
        container.innerHTML = ""; // Clear existing
        exerciseCount = 0;
        
        if (routineId && routinesData[routineId]) {
            const routine = routinesData[routineId];
            routine.exercises.forEach(ex => {
                const block = createExerciseBlock(ex.id);
                container.appendChild(block);
                
                // Add default sets based on routine definition
                const setsContainer = block.querySelector('.workout-sets-container');
                for (let i = 0; i < ex.sets; i++) {
                    setsContainer.appendChild(createSetRow());
                }
                updateSetNumbers(setsContainer);
            });
        }
    });

    // Add empty exercise block
    btnAddEx.addEventListener("click", () => {
        const block = createExerciseBlock();
        container.appendChild(block);
        // Add 1 empty set by default
        const setsContainer = block.querySelector('.workout-sets-container');
        setsContainer.appendChild(createSetRow());
        updateSetNumbers(setsContainer);
    });

    // Form submit
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const date = dateInput.value;
        const routine_id = routineSelect.value || null;
        const duration = document.getElementById("workout-duration").value;
        const notes = document.getElementById("workout-notes").value;
        
        const sets = [];
        let hasErrors = false;
        
        const blocks = container.querySelectorAll('.workout-exercise-block');
        blocks.forEach(block => {
            const exerciseSelect = block.querySelector('.we-select');
            const exercise_id = exerciseSelect.value;
            
            if (!exercise_id) {
                hasErrors = true;
                exerciseSelect.style.borderColor = "var(--color-danger)";
            } else {
                exerciseSelect.style.borderColor = "";
            }
            
            const rows = block.querySelectorAll('.workout-set-row');
            rows.forEach(row => {
                const repsInput = row.querySelector('input[name="reps"]');
                const weightInput = row.querySelector('input[name="weight"]');
                
                if (!repsInput.value) {
                    hasErrors = true;
                    repsInput.style.borderColor = "var(--color-danger)";
                } else {
                    repsInput.style.borderColor = "";
                }
                
                sets.push({
                    exercise_id: parseInt(exercise_id),
                    reps_completed: parseInt(repsInput.value || 0),
                    weight_kg: parseFloat(weightInput.value || 0),
                    rpe: null, // rpe functionality not implemented in UI yet
                    notes: ""
                });
            });
        });
        
        if (sets.length === 0) {
            showToast("Debes añadir al menos una serie.", "error");
            return;
        }
        
        if (hasErrors) {
            showToast("Por favor, completa los campos requeridos (Ejercicio y Reps).", "error");
            return;
        }

        const payload = {
            date: date,
            routine_id: routine_id ? parseInt(routine_id) : null,
            duration_minutes: duration ? parseInt(duration) : null,
            notes: notes,
            sets: sets
        };

        const btnSave = document.getElementById("btn-save-workout");
        const originalText = btnSave.textContent;
        btnSave.disabled = true;
        btnSave.textContent = "Guardando...";

        try {
            const response = await fetch("/workouts/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast("Entrenamiento registrado con éxito.", "success");
                setTimeout(() => {
                    window.location.href = "/workouts/";
                }, 1000);
            } else {
                showToast(result.message || "Error al guardar.", "error");
                btnSave.disabled = false;
                btnSave.textContent = originalText;
            }
        } catch (error) {
            console.error(error);
            showToast("Error de red.", "error");
            btnSave.disabled = false;
            btnSave.textContent = originalText;
        }
    });

    // --- Helpers ---

    function createExerciseBlock(preselectedExId = null) {
        exerciseCount++;
        const block = document.createElement('div');
        block.className = 'card workout-exercise-block';
        block.style.marginBottom = 'var(--space-md)';
        
        const header = document.createElement('div');
        header.className = 'flex flex--between';
        header.style.marginBottom = 'var(--space-md)';
        
        const select = sourceSelect.cloneNode(true);
        select.removeAttribute('id');
        select.className = 'form-select we-select';
        select.style.maxWidth = '300px';
        if (preselectedExId) select.value = preselectedExId;
        
        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn btn--sm btn--danger-outline';
        btnRemove.textContent = 'Quitar Ejercicio';
        btnRemove.onclick = () => block.remove();
        
        header.appendChild(select);
        header.appendChild(btnRemove);
        
        const labelsGrid = document.createElement('div');
        labelsGrid.className = 'workout-set-row we-labels';
        labelsGrid.innerHTML = `
            <div class="we-col-num"><span class="form-label--inline">Serie</span></div>
            <div class="we-col-input"><span class="form-label--inline">kg</span></div>
            <div class="we-col-input"><span class="form-label--inline">Reps</span></div>
            <div class="we-col-action"></div>
        `;
        
        const setsContainer = document.createElement('div');
        setsContainer.className = 'workout-sets-container';
        
        const btnAddSet = document.createElement('button');
        btnAddSet.type = 'button';
        btnAddSet.className = 'btn btn--sm we-btn-add-set';
        btnAddSet.textContent = '+ Serie';
        btnAddSet.style.marginTop = 'var(--space-sm)';
        btnAddSet.onclick = () => {
            setsContainer.appendChild(createSetRow());
            updateSetNumbers(setsContainer);
        };
        
        block.appendChild(header);
        block.appendChild(labelsGrid);
        block.appendChild(setsContainer);
        block.appendChild(btnAddSet);
        
        return block;
    }

    function createSetRow() {
        const row = document.createElement('div');
        row.className = 'workout-set-row';
        row.innerHTML = `
            <div class="we-col-num"><span class="we-set-number">1</span></div>
            <div class="we-col-input"><input type="number" name="weight" class="form-input" min="0" step="0.5" placeholder="0"></div>
            <div class="we-col-input"><input type="number" name="reps" class="form-input" min="1" placeholder="0"></div>
            <div class="we-col-action">
                <button type="button" class="btn-icon we-btn-remove-set" title="Eliminar serie">&times;</button>
            </div>
        `;
        
        row.querySelector('.we-btn-remove-set').addEventListener('click', function() {
            const container = this.closest('.workout-sets-container');
            if (container.children.length > 1) {
                row.remove();
                updateSetNumbers(container);
            } else {
                showToast("Debes tener al menos una serie.", "info");
            }
        });
        
        return row;
    }

    function updateSetNumbers(container) {
        const rows = container.querySelectorAll('.workout-set-row');
        rows.forEach((row, index) => {
            row.querySelector('.we-set-number').textContent = index + 1;
        });
    }
});
