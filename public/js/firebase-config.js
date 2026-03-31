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

// Titulaciones por defecto (fallback si no hay centros en Firestore)
const TITULACIONES_DEFAULT = [
    'Ingeniería Civil',
    'Grado en Edificación',
    'Máster en Ingeniería de Caminos, Canales y Puertos',
    'Máster BIM'
];

// Cursos por defecto (fallback)
const CURSOS_DEFAULT = ['1º', '2º', '3º', '4º', 'Máster'];

// Variables activas (se sobreescriben al cargar centro del usuario)
let TITULACIONES = [...TITULACIONES_DEFAULT];
let CURSOS = [...CURSOS_DEFAULT];

// Salt para generar códigos anónimos (NO exponer en producción real)
const SALT_ANONIMO = 'UEx_IA_2026_';

// --- Gestión de centros participantes ---

// Caché de centros (evita consultas repetidas a Firestore)
let _centrosCache = null;
let _centrosCacheTimestamp = 0;
const CENTROS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Centro UEx por defecto (fallback para backward compatibility)
const CENTRO_UEX_DEFAULT = {
    id: '_uex_default',
    nombre: 'Universidad de Extremadura',
    nombreCorto: 'UEx',
    pais: 'España',
    dominios: ['unex.es', 'alumnos.unex.es'],
    titulaciones: TITULACIONES_DEFAULT,
    cursos: CURSOS_DEFAULT,
    activo: true
};

// Cargar todos los centros activos (con caché)
async function cargarCentros(forzar) {
    const ahora = Date.now();
    if (!forzar && _centrosCache && (ahora - _centrosCacheTimestamp) < CENTROS_CACHE_TTL) {
        return _centrosCache;
    }

    try {
        const snapshot = await db.collection('centros').where('activo', '==', true).get();
        if (snapshot.empty) {
            // Fallback: si no hay centros en Firestore, usar UEx por defecto
            _centrosCache = [CENTRO_UEX_DEFAULT];
        } else {
            _centrosCache = snapshot.docs.map(function(doc) {
                return Object.assign({ id: doc.id }, doc.data());
            });
        }
        _centrosCacheTimestamp = ahora;
        return _centrosCache;
    } catch (error) {
        console.error('Error cargando centros:', error);
        // Fallback en caso de error
        if (_centrosCache) return _centrosCache;
        return [CENTRO_UEX_DEFAULT];
    }
}

// Extraer dominio de un email
function extraerDominio(email) {
    var parts = email.toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : null;
}

// Buscar centro por dominio de email
async function buscarCentroPorEmail(email) {
    var dominio = extraerDominio(email);
    if (!dominio) return null;

    var centros = await cargarCentros();
    for (var i = 0; i < centros.length; i++) {
        if (centros[i].dominios && centros[i].dominios.indexOf(dominio) !== -1) {
            return centros[i];
        }
    }
    return null;
}

// Obtener centro por ID
async function obtenerCentro(centroId) {
    var centros = await cargarCentros();
    for (var i = 0; i < centros.length; i++) {
        if (centros[i].id === centroId) return centros[i];
    }
    return null;
}

// Cargar titulaciones y cursos del centro del usuario actual
async function cargarConfigCentro(centroId) {
    if (!centroId) return;
    var centro = await obtenerCentro(centroId);
    if (centro) {
        TITULACIONES = centro.titulaciones || TITULACIONES_DEFAULT;
        CURSOS = centro.cursos || CURSOS_DEFAULT;
    }
}

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
