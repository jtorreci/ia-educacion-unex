// Lógica del panel de administración

let currentUser = null;
let currentUserData = null;

// Inicializar panel
async function initAdminPanel() {
    try {
        const { user, userData } = await verificarAuth('admin');
        currentUser = user;
        currentUserData = userData;

        document.getElementById('user-name').textContent = userData.nombre || user.email;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-avatar').textContent = (userData.nombre || user.email).charAt(0).toUpperCase();

        await cargarEstadisticas();
        mostrarSeccion('dashboard');

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error, 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

// Navegación entre secciones
function mostrarSeccion(seccion) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(`seccion-${seccion}`).style.display = 'block';

    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-seccion="${seccion}"]`)?.classList.add('active');

    // Cargar datos según sección
    switch(seccion) {
        case 'dashboard': cargarEstadisticas(); break;
        case 'profesores': cargarProfesores(); break;
        case 'asignaturas': cargarTodasAsignaturas(); break;
        case 'respuestas': cargarRespuestas(); break;
        case 'exportar': prepararExportacion(); break;
    }
}

// Dashboard con estadísticas
async function cargarEstadisticas() {
    try {
        const [profesores, asignaturas, respuestasPre, respuestasPost, rubricas] = await Promise.all([
            db.collection('usuarios').where('rol', '==', 'profesor').get(),
            db.collection('asignaturas').get(),
            db.collection('respuestas_pre').get(),
            db.collection('respuestas_post').get(),
            db.collection('rubricas').get()
        ]);

        // Contar estudiantes únicos
        let totalEstudiantes = 0;
        for (const asigDoc of asignaturas.docs) {
            const estudiantesSnap = await db.collection('asignaturas').doc(asigDoc.id).collection('estudiantes').get();
            totalEstudiantes += estudiantesSnap.size;
        }

        document.getElementById('stat-profesores').textContent = profesores.size;
        document.getElementById('stat-asignaturas').textContent = asignaturas.size;
        document.getElementById('stat-estudiantes').textContent = totalEstudiantes;
        document.getElementById('stat-respuestas').textContent = respuestasPre.size + respuestasPost.size;
        document.getElementById('stat-rubricas').textContent = rubricas.size;

        // Actividad reciente
        const actividadContainer = document.getElementById('actividad-reciente');
        const respuestasRecientes = [...respuestasPre.docs, ...respuestasPost.docs]
            .sort((a, b) => (b.data().fecha?.toDate() || 0) - (a.data().fecha?.toDate() || 0))
            .slice(0, 5);

        if (respuestasRecientes.length === 0) {
            actividadContainer.innerHTML = '<p style="color: var(--gris-oscuro);">No hay actividad reciente</p>';
        } else {
            actividadContainer.innerHTML = respuestasRecientes.map(doc => {
                const data = doc.data();
                const fecha = data.fecha?.toDate()?.toLocaleDateString('es-ES') || 'Sin fecha';
                return `
                    <div style="padding: 10px; background: var(--gris-fondo); border-radius: 6px; margin-bottom: 8px;">
                        <strong>${data.tipo === 'pre' ? 'Cuestionario PRE' : data.tipo === 'post' ? 'Cuestionario POST' : 'Encuesta reto'}</strong>
                        <span style="color: var(--gris-oscuro); font-size: 0.85rem;"> · ${fecha}</span>
                    </div>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Gestión de profesores
async function cargarProfesores() {
    const container = document.getElementById('lista-profesores');
    container.innerHTML = '<p>Cargando...</p>';

    try {
        const snapshot = await db.collection('usuarios').where('rol', '==', 'profesor').get();
        const profesores = snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));

        if (profesores.length === 0) {
            container.innerHTML = '<p style="color: var(--gris-oscuro);">No hay profesores registrados</p>';
            return;
        }

        container.innerHTML = profesores.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--gris-fondo); border-radius: 6px; margin-bottom: 8px;">
                <div>
                    <strong>${p.nombre || p.email}</strong>
                    <span style="color: var(--gris-oscuro); font-size: 0.85rem;"> - ${p.email}</span>
                </div>
                <button onclick="eliminarProfesor('${p.email}')" class="btn btn-sm" style="background: var(--rojo-error); color: white;">Eliminar</button>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">Error al cargar profesores</div>';
    }
}

async function agregarProfesor(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value.trim().toLowerCase();
    const nombre = form.nombre.value.trim();

    if (!email.endsWith('@unex.es')) {
        mostrarMensaje('El email debe ser institucional (@unex.es)', 'error');
        return;
    }

    try {
        await db.collection('usuarios').doc(email).set({
            email,
            nombre,
            rol: 'profesor',
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarMensaje('Profesor añadido correctamente', 'success');
        form.reset();
        cargarProfesores();

    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function eliminarProfesor(email) {
    if (!confirm(`¿Eliminar al profesor ${email}?`)) return;

    try {
        await db.collection('usuarios').doc(email).delete();
        mostrarMensaje('Profesor eliminado', 'success');
        cargarProfesores();
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Ver todas las asignaturas
async function cargarTodasAsignaturas() {
    const container = document.getElementById('lista-asignaturas');
    container.innerHTML = '<p>Cargando...</p>';

    try {
        const snapshot = await db.collection('asignaturas').get();
        const asignaturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (asignaturas.length === 0) {
            container.innerHTML = '<p style="color: var(--gris-oscuro);">No hay asignaturas creadas</p>';
            return;
        }

        let html = '';
        for (const asig of asignaturas) {
            const estudiantesSnap = await db.collection('asignaturas').doc(asig.id).collection('estudiantes').get();
            html += `
                <div class="form-card" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3>${asig.nombre} ${asig.esSimulacro ? '<span style="color: var(--naranja-warning);">(Simulacro)</span>' : ''}</h3>
                            <p style="color: var(--gris-oscuro);">${asig.titulacion} · ${asig.curso}</p>
                            <p style="color: var(--gris-oscuro); font-size: 0.85rem;">Profesor: ${asig.profesorEmail}</p>
                        </div>
                        <span style="background: var(--verde-primario); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                            ${estudiantesSnap.size} estudiantes
                        </span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">Error al cargar asignaturas</div>';
    }
}

// Ver respuestas (solo para investigación)
async function cargarRespuestas() {
    const container = document.getElementById('lista-respuestas');
    container.innerHTML = '<p>Cargando...</p>';

    try {
        const [preSnap, postSnap, retosSnap] = await Promise.all([
            db.collection('respuestas_pre').orderBy('fecha', 'desc').limit(20).get(),
            db.collection('respuestas_post').orderBy('fecha', 'desc').limit(20).get(),
            db.collection('respuestas_reto').orderBy('fecha', 'desc').limit(20).get()
        ]);

        const todas = [
            ...preSnap.docs.map(d => ({ id: d.id, tipo: 'PRE', ...d.data() })),
            ...postSnap.docs.map(d => ({ id: d.id, tipo: 'POST', ...d.data() })),
            ...retosSnap.docs.map(d => ({ id: d.id, tipo: 'RETO', ...d.data() }))
        ].sort((a, b) => (b.fecha?.toDate() || 0) - (a.fecha?.toDate() || 0));

        if (todas.length === 0) {
            container.innerHTML = '<p style="color: var(--gris-oscuro);">No hay respuestas registradas</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Código Anónimo</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${todas.map(r => `
                        <tr>
                            <td><span class="badge badge-${r.tipo.toLowerCase()}">${r.tipo}</span></td>
                            <td><code>${r.codigoAnonimo?.substring(0, 8) || 'N/A'}...</code></td>
                            <td>${r.fecha?.toDate()?.toLocaleDateString('es-ES') || 'Sin fecha'}</td>
                            <td><button onclick="verDetalle('${r.id}', '${r.tipo}')" class="btn btn-sm btn-secondary">Ver</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">Error al cargar respuestas</div>';
    }
}

async function verDetalle(id, tipo) {
    const coleccion = tipo === 'PRE' ? 'respuestas_pre' : tipo === 'POST' ? 'respuestas_post' : 'respuestas_reto';

    try {
        const doc = await db.collection(coleccion).doc(id).get();
        const data = doc.data();

        alert(JSON.stringify(data, null, 2));
    } catch (error) {
        mostrarMensaje('Error al cargar detalle', 'error');
    }
}

// Exportación de datos
async function prepararExportacion() {
    document.getElementById('btn-exportar-pre').onclick = () => exportarColeccion('respuestas_pre', 'cuestionarios_pre.json');
    document.getElementById('btn-exportar-post').onclick = () => exportarColeccion('respuestas_post', 'cuestionarios_post.json');
    document.getElementById('btn-exportar-retos').onclick = () => exportarColeccion('respuestas_reto', 'encuestas_reto.json');
    document.getElementById('btn-exportar-rubricas').onclick = () => exportarColeccion('rubricas', 'rubricas.json');
    document.getElementById('btn-exportar-todo').onclick = exportarTodo;
}

async function exportarColeccion(nombre, archivo) {
    try {
        const snapshot = await db.collection(nombre).get();
        const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        descargarJSON(datos, archivo);
        mostrarMensaje(`Exportados ${datos.length} registros`, 'success');
    } catch (error) {
        mostrarMensaje('Error al exportar: ' + error.message, 'error');
    }
}

async function exportarTodo() {
    try {
        const [pre, post, retos, rubricas] = await Promise.all([
            db.collection('respuestas_pre').get(),
            db.collection('respuestas_post').get(),
            db.collection('respuestas_reto').get(),
            db.collection('rubricas').get()
        ]);

        const datos = {
            exportadoEn: new Date().toISOString(),
            cuestionarios_pre: pre.docs.map(d => ({ id: d.id, ...d.data() })),
            cuestionarios_post: post.docs.map(d => ({ id: d.id, ...d.data() })),
            encuestas_reto: retos.docs.map(d => ({ id: d.id, ...d.data() })),
            rubricas: rubricas.docs.map(d => ({ id: d.id, ...d.data() }))
        };

        descargarJSON(datos, 'datos_completos_investigacion.json');
        mostrarMensaje('Exportación completa realizada', 'success');
    } catch (error) {
        mostrarMensaje('Error al exportar: ' + error.message, 'error');
    }
}

function descargarJSON(datos, nombreArchivo) {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', initAdminPanel);
