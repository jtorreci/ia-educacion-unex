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

                // Verificar que el centro del usuario sigue activo
                if (userData.centroId) {
                    const centro = await obtenerCentro(userData.centroId);
                    if (!centro) {
                        await auth.signOut();
                        throw new Error('Tu universidad ha sido desactivada del proyecto. Contacta con el coordinador.');
                    }
                }

                // Backward compatibility: asociar centroId si no lo tiene
                if (!userData.centroId && userData.rol !== 'admin') {
                    const centro = await buscarCentroPorEmail(email.toLowerCase());
                    if (centro && centro.id !== '_uex_default') {
                        // Actualizar usuario con su centroId (solo si es admin el que escribe, o si es el propio usuario)
                        try {
                            await db.collection('usuarios').doc(email.toLowerCase()).update({ centroId: centro.id });
                        } catch (e) {
                            // Puede fallar por permisos, no es crítico
                            console.warn('No se pudo asociar centroId automáticamente:', e.message);
                        }
                    }
                }

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
                throw new Error('Tu profesor aún no te ha dado de alta en el sistema. ' +
                    'Pídele que añada tu email desde su panel de profesor (sección "Gestionar estudiantes") ' +
                    'y después vuelve a intentarlo.');
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

            // Validar dominio contra centros registrados
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando...';

            const centro = await buscarCentroPorEmail(email);
            if (!centro) {
                mensajeDiv.innerHTML = '<div class="alert alert-error">' +
                    'Tu universidad no está registrada en el proyecto. ' +
                    'Debes usar un email institucional de una universidad participante.<br><br>' +
                    'Si tu universidad quiere participar, visita la página ' +
                    '<a href="/participar.html">Participar</a>.' +
                    '</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar enlace de acceso';
                return;
            }

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
