document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    
    if (registerForm) {
        const passwordInput = document.getElementById("password");
        const confirmInput = document.getElementById("confirm_password");
        const errorMsg = document.getElementById("password-error");

        registerForm.addEventListener("submit", (e) => {
            if (passwordInput.value !== confirmInput.value) {
                e.preventDefault(); // Prevent form submission
                
                // Show error state
                confirmInput.style.borderColor = "var(--color-danger)";
                errorMsg.style.display = "block";
                
                // Optionally shake the input or use toast
                if (typeof showToast === "function") {
                    showToast("Las contraseñas no coinciden.", "error");
                }
            } else {
                // Clear error state just in case
                confirmInput.style.borderColor = "";
                errorMsg.style.display = "none";
            }
        });
        
        // Clear error as user types
        confirmInput.addEventListener("input", () => {
            if (passwordInput.value === confirmInput.value) {
                confirmInput.style.borderColor = "var(--color-success)";
                errorMsg.style.display = "none";
            } else {
                confirmInput.style.borderColor = "";
            }
        });
    }
});
