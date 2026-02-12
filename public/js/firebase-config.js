// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAuCXGKrw1n-DGUfYoK958i_KSCdb8bkfs",
    authDomain: "gestor-investigacion-app.firebaseapp.com",
    projectId: "gestor-investigacion-app",
    storageBucket: "gestor-investigacion-app.firebasestorage.app",
    messagingSenderId: "303130285560",
    appId: "1:303130285560:web:9f29eae853effeacdd720d",
    measurementId: "G-LKHKLYB27H"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const db = firebase.firestore();

// Configuración de Email Link Authentication
const actionCodeSettings = {
    url: window.location.origin + '/app/verificar.html',
    handleCodeInApp: true
};

// Titulaciones disponibles
const TITULACIONES = [
    'Ingeniería Civil',
    'Grado en Edificación',
    'Máster en Ingeniería de Caminos, Canales y Puertos',
    'Máster BIM'
];

// Cursos disponibles
const CURSOS = ['1º', '2º', '3º', '4º', 'Máster'];

// Salt para generar códigos anónimos (NO exponer en producción real)
const SALT_ANONIMO = 'UEx_IA_2026_';

// Función para generar código anónimo
async function generarCodigoAnonimo(email, asignaturaId) {
    const texto = SALT_ANONIMO + email.toLowerCase() + '_' + asignaturaId;
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // Primeros 16 caracteres
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo = 'info') {
    const container = document.getElementById('mensaje-container');
    if (container) {
        container.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// Función para formatear fecha
function formatearFecha(timestamp) {
    if (!timestamp) return '-';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Verificar estado de autenticación
function verificarAuth(rolRequerido = null) {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await db.collection('usuarios').doc(user.email).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (rolRequerido && userData.rol !== rolRequerido && userData.rol !== 'admin') {
                            reject('No tienes permisos para acceder a esta página');
                        } else {
                            resolve({ user, userData });
                        }
                    } else {
                        reject('Usuario no registrado en el sistema');
                    }
                } catch (error) {
                    reject('Error al verificar usuario: ' + error.message);
                }
            } else {
                reject('No has iniciado sesión');
            }
        });
    });
}

// Cerrar sesión
function cerrarSesion() {
    auth.signOut().then(() => {
        window.location.href = '/';
    });
}
