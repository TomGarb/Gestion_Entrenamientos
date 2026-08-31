document.addEventListener("DOMContentLoaded", () => {
    const btnGenerate = document.getElementById("btn-generate-token");
    const display = document.getElementById("token-display");

    if (btnGenerate) {
        btnGenerate.addEventListener("click", async () => {
            btnGenerate.disabled = true;
            btnGenerate.textContent = "Generando...";

            try {
                const response = await fetch("/telegram/generate_token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    display.textContent = data.token;
                    display.style.display = "block";
                    btnGenerate.textContent = "Generar Nuevo Código";
                    btnGenerate.disabled = false;
                    
                    if (typeof showToast === "function") {
                        showToast("Token generado con éxito.", "success");
                    }
                } else {
                    if (typeof showToast === "function") {
                        showToast(data.message || "Error al generar el token.", "error");
                    }
                    btnGenerate.textContent = "Generar Código";
                    btnGenerate.disabled = false;
                }
            } catch (error) {
                console.error(error);
                if (typeof showToast === "function") {
                    showToast("Error de conexión.", "error");
                }
                btnGenerate.textContent = "Generar Código";
                btnGenerate.disabled = false;
            }
        });
    }
});
