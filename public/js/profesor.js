// Lógica del panel de profesor

let currentUser = null;
let currentUserData = null;
let asignaturas = [];

// Inicializar panel
async function initProfesorPanel() {
    try {
        const { user, userData } = await verificarAuth('profesor');
        currentUser = user;
        currentUserData = userData;

        document.getElementById('user-name').textContent = userData.nombre || user.email;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-avatar').textContent = (userData.nombre || user.email).charAt(0).toUpperCase();

        await cargarAsignaturas();

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error, 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

// Cargar asignaturas del profesor
async function cargarAsignaturas() {
    const container = document.getElementById('asignaturas-container');
    container.innerHTML = '<p>Cargando asignaturas...</p>';

    try {
        const snapshot = await db.collection('asignaturas')
            .where('profesorEmail', '==', currentUser.email)
            .get();

        asignaturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (asignaturas.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No tienes asignaturas creadas aún.
                    <button onclick="mostrarFormAsignatura()" class="btn btn-sm btn-primary" style="margin-left: 15px;">Crear asignatura</button>
                </div>
            `;
            return;
        }

        let html = '';
        for (const asig of asignaturas) {
            const estudiantesSnap = await db.collection('asignaturas').doc(asig.id).collection('estudiantes').get();
            const numEstudiantes = estudiantesSnap.size;
            html += renderAsignaturaCard(asig, numEstudiantes);
        }

        html += `<div style="text-align: center; margin-top: 20px;">
            <button onclick="mostrarFormAsignatura()" class="btn btn-outline">+ Nueva asignatura</button>
        </div>`;

        container.innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="alert alert-error">Error al cargar asignaturas</div>';
    }
}

function renderAsignaturaCard(asig, numEstudiantes) {
    return `
        <div class="form-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h2>${asig.nombre} ${asig.esSimulacro ? '<span style="color: var(--naranja-warning);">(Simulacro)</span>' : ''}</h2>
                    <p style="color: var(--gris-oscuro);">${asig.titulacion} · ${asig.curso}</p>
                </div>
                <span style="background: var(--verde-primario); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                    ${numEstudiantes} estudiantes
                </span>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="gestionarEstudiantes('${asig.id}')" class="btn btn-sm btn-secondary">
                    👥 Gestionar estudiantes
                </button>
                <button onclick="evaluarAsignatura('${asig.id}')" class="btn btn-sm btn-primary">
                    ✅ Evaluar con rúbrica
                </button>
            </div>
        </div>
    `;
}

// Mostrar formulario de nueva asignatura
function mostrarFormAsignatura() {
    const container = document.getElementById('asignaturas-container');
    container.innerHTML = `
        <div class="form-card">
            <h2>Nueva Asignatura</h2>

            <form id="form-asignatura" onsubmit="crearAsignatura(event)">
                <div class="form-group">
                    <label class="required">Nombre de la asignatura</label>
                    <input type="text" name="nombre" class="form-control" required>
                </div>

                <div class="form-group">
                    <label class="required">Titulación</label>
                    <select name="titulacion" class="form-control" required>
                        <option value="">Selecciona...</option>
                        ${TITULACIONES.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="required">Curso</label>
                    <select name="curso" class="form-control" required>
                        <option value="">Selecciona...</option>
                        ${CURSOS.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" name="esSimulacro"> Es asignatura de simulacro/prueba
                    </label>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="cargarAsignaturas()" class="btn btn-outline">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Crear asignatura</button>
                </div>
            </form>
        </div>
    `;
}

async function crearAsignatura(event) {
    event.preventDefault();
    const form = event.target;

    try {
        await db.collection('asignaturas').add({
            nombre: form.nombre.value,
            titulacion: form.titulacion.value,
            curso: form.curso.value,
            esSimulacro: form.esSimulacro.checked,
            profesorEmail: currentUser.email,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarMensaje('Asignatura creada correctamente', 'success');
        cargarAsignaturas();

    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Gestionar estudiantes
async function gestionarEstudiantes(asignaturaId) {
    const asig = asignaturas.find(a => a.id === asignaturaId);
    const container = document.getElementById('asignaturas-container');

    const estudiantesSnap = await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').get();
    const estudiantes = estudiantesSnap.docs.map(doc => ({ email: doc.id, ...doc.data() }));

    container.innerHTML = `
        <div class="form-card">
            <h2>Estudiantes de ${asig.nombre}</h2>

            <div id="lista-estudiantes">
                ${estudiantes.length === 0 ? '<p style="color: var(--gris-oscuro);">No hay estudiantes inscritos</p>' :
                    estudiantes.map(e => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--gris-fondo); border-radius: 6px; margin-bottom: 8px;">
                            <div>
                                <strong>${e.nombre || e.email}</strong>
                                <span style="color: var(--gris-oscuro); font-size: 0.85rem;"> - ${e.email}</span>
                            </div>
                            <button onclick="eliminarEstudiante('${asignaturaId}', '${e.email}')" class="btn btn-sm" style="background: var(--rojo-error); color: white;">Eliminar</button>
                        </div>
                    `).join('')
                }
            </div>

            <h3 style="margin-top: 25px;">Añadir estudiantes</h3>
            <form onsubmit="agregarEstudiantes(event, '${asignaturaId}')">
                <div class="form-group">
                    <label>Emails de estudiantes (uno por línea)</label>
                    <textarea name="emails" class="form-control" placeholder="estudiante1@alumnos.unex.es&#10;estudiante2@alumnos.unex.es" rows="5"></textarea>
                </div>
                <div style="display: flex; gap: 15px;">
                    <button type="button" onclick="cargarAsignaturas()" class="btn btn-outline">Volver</button>
                    <button type="submit" class="btn btn-primary">Añadir estudiantes</button>
                </div>
            </form>
        </div>
    `;
}

async function agregarEstudiantes(event, asignaturaId) {
    event.preventDefault();
    const emails = event.target.emails.value.split('\n').map(e => e.trim().toLowerCase()).filter(e => e);

    try {
        for (const email of emails) {
            // Generar código anónimo
            const codigoAnonimo = await generarCodigoAnonimo(email, asignaturaId);

            // Crear usuario si no existe
            await db.collection('usuarios').doc(email).set({
                email,
                rol: 'estudiante',
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Inscribir en asignatura
            await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').doc(email).set({
                nombre: email.split('@')[0],
                codigoAnonimo,
                fechaInscripcion: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        mostrarMensaje(`${emails.length} estudiantes añadidos`, 'success');
        gestionarEstudiantes(asignaturaId);

    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function eliminarEstudiante(asignaturaId, email) {
    if (!confirm('¿Eliminar este estudiante de la asignatura?')) return;

    try {
        await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').doc(email).delete();
        mostrarMensaje('Estudiante eliminado', 'success');
        gestionarEstudiantes(asignaturaId);
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Evaluar con rúbrica
async function evaluarAsignatura(asignaturaId) {
    const asig = asignaturas.find(a => a.id === asignaturaId);
    const container = document.getElementById('asignaturas-container');

    const estudiantesSnap = await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').get();
    const estudiantes = estudiantesSnap.docs.map(doc => ({ email: doc.id, ...doc.data() }));

    container.innerHTML = `
        <div class="form-card">
            <h2>Evaluar - ${asig.nombre}</h2>

            <form id="form-rubrica" onsubmit="guardarRubrica(event, '${asignaturaId}')">
                <div class="form-group">
                    <label class="required">Estudiante</label>
                    <select name="estudiante" class="form-control" required>
                        <option value="">Selecciona estudiante...</option>
                        ${estudiantes.map(e => `<option value="${e.email}" data-codigo="${e.codigoAnonimo}">${e.nombre || e.email}</option>`).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label class="required">Reto evaluado</label>
                        <select name="numeroReto" class="form-control" required>
                            <option value="1">Reto 1</option>
                            <option value="2">Reto 2</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="required">Condición</label>
                        <select name="condicion" class="form-control" required>
                            <option value="sin_ia">Sin IA</option>
                            <option value="con_ia">Con IA</option>
                        </select>
                    </div>
                </div>

                <h3 style="margin-top: 25px;">Criterios de evaluación (1-4)</h3>
                <p style="color: var(--gris-oscuro); margin-bottom: 15px;">1=Insuficiente, 2=Suficiente, 3=Bueno, 4=Excelente</p>

                <table class="likert-table">
                    <thead>
                        <tr><th>Criterio</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>
                    </thead>
                    <tbody>
                        ${['Comprensión del problema', 'Calidad de la solución', 'Razonamiento', 'Uso de conceptos', 'Presentación', 'Originalidad'].map((criterio, i) => `
                            <tr>
                                <td>${criterio}</td>
                                <td><input type="radio" name="criterio${i}" value="1" required></td>
                                <td><input type="radio" name="criterio${i}" value="2"></td>
                                <td><input type="radio" name="criterio${i}" value="3"></td>
                                <td><input type="radio" name="criterio${i}" value="4"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="form-group" style="margin-top: 20px;">
                    <label>Observaciones</label>
                    <textarea name="observaciones" class="form-control" placeholder="Comentarios sobre el trabajo..."></textarea>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="cargarAsignaturas()" class="btn btn-outline">Volver</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Guardar evaluación</button>
                </div>
            </form>
        </div>
    `;
}

async function guardarRubrica(event, asignaturaId) {
    event.preventDefault();
    const form = event.target;

    const select = form.estudiante;
    const codigoAnonimo = select.options[select.selectedIndex].dataset.codigo;

    const puntuaciones = [];
    for (let i = 0; i < 6; i++) {
        puntuaciones.push(parseInt(form[`criterio${i}`].value));
    }
    const total = puntuaciones.reduce((a, b) => a + b, 0);

    try {
        await db.collection('rubricas').add({
            codigoAnonimo,
            asignaturaId,
            numeroReto: parseInt(form.numeroReto.value),
            condicion: form.condicion.value,
            evaluadorEmail: currentUser.email,
            puntuaciones: {
                comprension: puntuaciones[0],
                calidad: puntuaciones[1],
                razonamiento: puntuaciones[2],
                conceptos: puntuaciones[3],
                presentacion: puntuaciones[4],
                originalidad: puntuaciones[5]
            },
            total,
            observaciones: form.observaciones.value,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarMensaje('Evaluación guardada correctamente', 'success');
        form.reset();

    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', initProfesorPanel);
