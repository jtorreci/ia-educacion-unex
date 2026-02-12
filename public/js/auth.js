// Autenticación con Email Link (Magic Link)

// Enviar enlace de inicio de sesión
async function enviarEnlaceLogin(email) {
    try {
        // Guardar email en localStorage para recuperarlo después
        window.localStorage.setItem('emailParaLogin', email);

        // Enviar email con enlace
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);

        return true;
    } catch (error) {
        console.error('Error enviando enlace:', error);
        throw error;
    }
}

// Completar inicio de sesión (cuando el usuario hace clic en el enlace)
async function completarLogin() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailParaLogin');

        if (!email) {
            // Si no tenemos el email, pedirlo al usuario
            email = window.prompt('Por favor, introduce tu email para confirmar:');
        }

        try {
            const result = await auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('emailParaLogin');

            // Obtener datos del usuario
            const userDoc = await db.collection('usuarios').doc(email.toLowerCase()).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                // Redirigir según rol
                switch (userData.rol) {
                    case 'admin':
                        window.location.href = '/app/admin.html';
                        break;
                    case 'profesor':
                        window.location.href = '/app/profesor.html';
                        break;
                    case 'estudiante':
                        window.location.href = '/app/estudiante.html';
                        break;
                    default:
                        window.location.href = '/';
                }
            } else {
                // Usuario autenticado pero no registrado en el sistema
                await auth.signOut();
                throw new Error('Este email no está registrado en el sistema. Contacta con tu profesor.');
            }

            return result.user;
        } catch (error) {
            console.error('Error completando login:', error);
            throw error;
        }
    }
    return null;
}

// Verificar si hay sesión activa y redirigir
async function verificarSesionYRedirigir() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('usuarios').doc(user.email).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    switch (userData.rol) {
                        case 'admin':
                            window.location.href = '/app/admin.html';
                            break;
                        case 'profesor':
                            window.location.href = '/app/profesor.html';
                            break;
                        case 'estudiante':
                            window.location.href = '/app/estudiante.html';
                            break;
                    }
                }
            } catch (error) {
                console.error('Error verificando sesión:', error);
            }
        }
    });
}

// Inicializar página de login
function initLoginPage() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submit-btn');
    const mensajeDiv = document.getElementById('mensaje');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim().toLowerCase();

            if (!email.endsWith('@unex.es') && !email.endsWith('@alumnos.unex.es')) {
                mensajeDiv.innerHTML = '<div class="alert alert-error">Debes usar un email institucional (@unex.es o @alumnos.unex.es)</div>';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                await enviarEnlaceLogin(email);
                mensajeDiv.innerHTML = `
                    <div class="alert alert-success">
                        <strong>¡Enlace enviado!</strong><br>
                        Revisa tu bandeja de entrada (y spam) en <strong>${email}</strong>.<br>
                        Haz clic en el enlace del email para acceder.
                    </div>
                `;
                form.style.display = 'none';
            } catch (error) {
                mensajeDiv.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar enlace de acceso';
            }
        });
    }

    // Verificar si ya hay sesión
    verificarSesionYRedirigir();
}

// Inicializar página de verificación (donde llega el magic link)
function initVerificarPage() {
    const mensajeDiv = document.getElementById('mensaje');

    completarLogin()
        .then((user) => {
            if (user) {
                mensajeDiv.innerHTML = '<div class="alert alert-success">Verificación correcta. Redirigiendo...</div>';
            } else {
                mensajeDiv.innerHTML = '<div class="alert alert-error">Enlace inválido o expirado. <a href="/app/login.html">Volver a intentar</a></div>';
            }
        })
        .catch((error) => {
            mensajeDiv.innerHTML = `<div class="alert alert-error">Error: ${error.message}. <a href="/app/login.html">Volver a intentar</a></div>`;
        });
}
