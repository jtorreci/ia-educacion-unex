// Autenticación: Email/Password + Magic Link

// ===== NAVEGACIÓN ENTRE PANELES =====

function mostrarPanel(panel) {
    ['login', 'registro', 'reset', 'magic'].forEach(function(p) {
        var el = document.getElementById('panel-' + p);
        if (el) el.style.display = p === panel ? 'block' : 'none';
    });
    document.getElementById('mensaje').innerHTML = '';
}

// ===== REGISTRO CON EMAIL/PASSWORD =====

async function registrarConPassword(event) {
    event.preventDefault();
    var form = event.target;
    var email = form.email.value.trim().toLowerCase();
    var password = form.password.value;
    var password2 = form.password2.value;
    var mensajeDiv = document.getElementById('mensaje');
    var submitBtn = form.querySelector('button[type="submit"]');

    if (password !== password2) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">Las contraseñas no coinciden</div>';
        return;
    }
    if (password.length < 6) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">La contraseña debe tener al menos 6 caracteres</div>';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    var centro = await buscarCentroPorEmail(email);
    if (!centro) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">' +
            'Tu universidad no está registrada en el proyecto. Usa un email institucional.' +
            '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear cuenta';
        return;
    }

    try {
        submitBtn.textContent = 'Creando cuenta...';

        var result = await auth.createUserWithEmailAndPassword(email, password);

        // Enviar email de verificación
        await result.user.sendEmailVerification({
            url: window.location.origin + '/app/login.html?verified=1'
        });

        // Crear documento en Firestore si no existe (puede que un profesor lo haya creado antes)
        var userDoc = await db.collection('usuarios').doc(email).get();
        if (!userDoc.exists) {
            var nuevoUsuario = {
                email: email,
                rol: 'estudiante',
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (centro.id !== '_uex_default') {
                nuevoUsuario.centroId = centro.id;
            }
            await db.collection('usuarios').doc(email).set(nuevoUsuario);
        }

        // Cerrar sesión hasta que verifique el email
        await auth.signOut();

        mensajeDiv.innerHTML = '<div class="alert alert-success">' +
            '<strong>Cuenta creada.</strong><br>' +
            'Hemos enviado un email de verificación a <strong>' + email + '</strong>.<br>' +
            'Haz clic en el enlace del email para activar tu cuenta.<br>' +
            '<em>Revisa también la carpeta de spam.</em>' +
            '</div>';
        form.style.display = 'none';

    } catch (error) {
        var msg = error.message;
        if (error.code === 'auth/email-already-in-use') {
            msg = 'Ya existe una cuenta con este email. ' +
                '<a href="#" onclick="mostrarPanel(\'login\'); return false;">Inicia sesión</a> o ' +
                '<a href="#" onclick="mostrarPanel(\'reset\'); return false;">establece tu contraseña</a>.';
        }
        mensajeDiv.innerHTML = '<div class="alert alert-error">' + msg + '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear cuenta';
    }
}

// ===== LOGIN CON PASSWORD =====

async function loginConPassword(event) {
    event.preventDefault();
    var form = event.target;
    var email = form.email.value.trim().toLowerCase();
    var password = form.password.value;
    var mensajeDiv = document.getElementById('mensaje');
    var submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
        var result = await auth.signInWithEmailAndPassword(email, password);

        if (!result.user.emailVerified) {
            mensajeDiv.innerHTML = '<div class="alert alert-warning">' +
                'Tu email aún no está verificado.<br>' +
                '<a href="#" onclick="reenviarVerificacion(); return false;">Reenviar email de verificación</a>' +
                '</div>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
            return;
        }

        // Verificar/crear documento en Firestore
        var userDoc = await db.collection('usuarios').doc(email).get();
        if (!userDoc.exists) {
            var centro = await buscarCentroPorEmail(email);
            if (centro) {
                var nuevoUsuario = {
                    email: email,
                    rol: 'estudiante',
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (centro.id !== '_uex_default') {
                    nuevoUsuario.centroId = centro.id;
                }
                await db.collection('usuarios').doc(email).set(nuevoUsuario);
                window.location.href = '/app/estudiante.html';
                return;
            }
        }

        var userData = userDoc.exists ? userDoc.data() : { rol: 'estudiante' };
        redirigirPorRol(userData.rol);

    } catch (error) {
        var msg = error.message;
        if (error.code === 'auth/user-not-found') {
            msg = 'No existe una cuenta con este email. ' +
                '<a href="#" onclick="mostrarPanel(\'registro\'); return false;">Regístrate</a>.';
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'Credenciales incorrectas. ' +
                '<a href="#" onclick="mostrarPanel(\'reset\'); return false;">¿Olvidaste tu contraseña?</a>';
        }
        mensajeDiv.innerHTML = '<div class="alert alert-error">' + msg + '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
}

// ===== REENVIAR VERIFICACIÓN =====

async function reenviarVerificacion() {
    var mensajeDiv = document.getElementById('mensaje');
    try {
        var user = auth.currentUser;
        if (user) {
            await user.sendEmailVerification({
                url: window.location.origin + '/app/login.html?verified=1'
            });
            await auth.signOut();
            mensajeDiv.innerHTML = '<div class="alert alert-success">' +
                'Email de verificación reenviado. Revisa tu bandeja (y spam).' +
                '</div>';
        }
    } catch (error) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">Error: ' + error.message + '</div>';
    }
}

// ===== RESTABLECER / ESTABLECER CONTRASEÑA =====

async function enviarResetPassword(event) {
    event.preventDefault();
    var form = event.target;
    var email = form.email.value.trim().toLowerCase();
    var mensajeDiv = document.getElementById('mensaje');
    var submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        await auth.sendPasswordResetEmail(email, {
            url: window.location.origin + '/app/login.html'
        });

        mensajeDiv.innerHTML = '<div class="alert alert-success">' +
            'Enlace enviado a <strong>' + email + '</strong>.<br>' +
            'Haz clic en el enlace del email para establecer tu contraseña.<br>' +
            '<em>Revisa también la carpeta de spam.</em>' +
            '</div>';
        form.style.display = 'none';

    } catch (error) {
        var msg = error.message;
        if (error.code === 'auth/user-not-found') {
            msg = 'No existe una cuenta con este email. ' +
                '<a href="#" onclick="mostrarPanel(\'registro\'); return false;">Regístrate</a>.';
        }
        mensajeDiv.innerHTML = '<div class="alert alert-error">' + msg + '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar enlace';
    }
}

// ===== MAGIC LINK =====

async function enviarMagicLink(event) {
    event.preventDefault();
    var form = event.target;
    var email = form.email.value.trim().toLowerCase();
    var mensajeDiv = document.getElementById('mensaje');
    var submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    var centro = await buscarCentroPorEmail(email);
    if (!centro) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">' +
            'Tu universidad no está registrada en el proyecto.' +
            '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar enlace';
        return;
    }

    submitBtn.textContent = 'Enviando...';

    try {
        window.localStorage.setItem('emailParaLogin', email);
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);

        mensajeDiv.innerHTML = '<div class="alert alert-success">' +
            '<strong>Enlace enviado.</strong><br>' +
            'Revisa tu bandeja de entrada (y spam) en <strong>' + email + '</strong>.<br>' +
            'Haz clic en el enlace para acceder directamente.' +
            '</div>';
        form.style.display = 'none';

    } catch (error) {
        mensajeDiv.innerHTML = '<div class="alert alert-error">' + error.message + '</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar enlace';
    }
}

// ===== UTILIDADES =====

function redirigirPorRol(rol) {
    switch (rol) {
        case 'admin': window.location.href = '/app/admin.html'; break;
        case 'profesor': window.location.href = '/app/profesor.html'; break;
        case 'estudiante': window.location.href = '/app/estudiante.html'; break;
        default: window.location.href = '/';
    }
}

// ===== COMPLETAR LOGIN CON MAGIC LINK (verificar.html) =====

async function completarLogin() {
    if (auth.isSignInWithEmailLink(window.location.href)) {
        var email = window.localStorage.getItem('emailParaLogin');

        if (!email) {
            email = window.prompt('Por favor, introduce tu email para confirmar:');
        }

        try {
            var result = await auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('emailParaLogin');

            var userDoc = await db.collection('usuarios').doc(email.toLowerCase()).get();

            if (userDoc.exists) {
                var userData = userDoc.data();

                // Verificar que el centro del usuario sigue activo
                if (userData.centroId) {
                    var centro = await obtenerCentro(userData.centroId);
                    if (!centro) {
                        await auth.signOut();
                        throw new Error('Tu universidad ha sido desactivada del proyecto. Contacta con el coordinador.');
                    }
                }

                // Backward compatibility: asociar centroId si no lo tiene
                if (!userData.centroId && userData.rol !== 'admin') {
                    var centroByEmail = await buscarCentroPorEmail(email.toLowerCase());
                    if (centroByEmail && centroByEmail.id !== '_uex_default') {
                        try {
                            await db.collection('usuarios').doc(email.toLowerCase()).update({ centroId: centroByEmail.id });
                        } catch (e) {
                            console.warn('No se pudo asociar centroId automáticamente:', e.message);
                        }
                    }
                }

                redirigirPorRol(userData.rol);
            } else {
                // Auto-registro si el dominio es válido
                var centro = await buscarCentroPorEmail(email.toLowerCase());
                if (centro) {
                    var nuevoUsuario = {
                        email: email.toLowerCase(),
                        rol: 'estudiante',
                        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    if (centro.id !== '_uex_default') {
                        nuevoUsuario.centroId = centro.id;
                    }
                    await db.collection('usuarios').doc(email.toLowerCase()).set(nuevoUsuario);
                    window.location.href = '/app/estudiante.html';
                } else {
                    await auth.signOut();
                    throw new Error('Tu universidad no está registrada en el proyecto. ' +
                        'Debes usar un email institucional de una universidad participante.');
                }
            }

            return result.user;
        } catch (error) {
            console.error('Error completando login:', error);
            throw error;
        }
    }
    return null;
}

// ===== VERIFICAR SESIÓN ACTIVA =====

async function verificarSesionYRedirigir() {
    auth.onAuthStateChanged(async function(user) {
        if (user && user.emailVerified) {
            try {
                var userDoc = await db.collection('usuarios').doc(user.email).get();
                if (userDoc.exists) {
                    redirigirPorRol(userDoc.data().rol);
                }
            } catch (error) {
                console.error('Error verificando sesión:', error);
            }
        }
    });
}

// ===== INICIALIZAR PÁGINAS =====

function initLoginPage() {
    // Detectar redirección post-verificación
    var params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
        document.getElementById('mensaje').innerHTML =
            '<div class="alert alert-success">Email verificado correctamente. Ya puedes iniciar sesión.</div>';
    }

    // Verificar si ya hay sesión activa
    verificarSesionYRedirigir();
}

function initVerificarPage() {
    var mensajeDiv = document.getElementById('mensaje');

    completarLogin()
        .then(function(user) {
            if (user) {
                mensajeDiv.innerHTML = '<div class="alert alert-success">Verificación correcta. Redirigiendo...</div>';
            } else {
                mensajeDiv.innerHTML = '<div class="alert alert-error">Enlace inválido o expirado. <a href="/app/login.html">Volver a intentar</a></div>';
            }
        })
        .catch(function(error) {
            mensajeDiv.innerHTML = '<div class="alert alert-error">Error: ' + error.message + '. <a href="/app/login.html">Volver a intentar</a></div>';
        });
}
