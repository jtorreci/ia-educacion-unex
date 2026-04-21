// Lógica del panel de profesor

let currentUser = null;
let currentUserData = null;
let currentCentro = null;
let asignaturas = [];

// Inicializar panel
async function initProfesorPanel() {
    try {
        const { user, userData } = await verificarAuth('profesor');
        currentUser = user;
        currentUserData = userData;

        // Cargar centro del profesor
        if (userData.centroId) {
            currentCentro = await obtenerCentro(userData.centroId);
            await cargarConfigCentro(userData.centroId);
        } else {
            // Backward compatibility: buscar centro por dominio de email
            currentCentro = await buscarCentroPorEmail(user.email);
        }

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
    const codigo = asig.codigoInvitacion || '—';
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

            <div style="display: flex; align-items: center; gap: 10px; margin-top: 15px; padding: 10px 15px; background: var(--gris-fondo); border-radius: 8px;">
                <span style="color: var(--gris-oscuro); font-size: 0.85rem;">Código de invitación:</span>
                <code style="font-size: 1.2rem; font-weight: 700; letter-spacing: 3px; color: var(--azul-primario);">${codigo}</code>
                ${codigo !== '—' ? `<button onclick="copiarCodigo('${codigo}')" class="btn btn-sm btn-outline" style="padding: 3px 10px; font-size: 0.75rem;">Copiar</button>` : `<button onclick="generarCodigoParaAsignatura('${asig.id}')" class="btn btn-sm btn-outline" style="padding: 3px 10px; font-size: 0.75rem;">Generar</button>`}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                <button onclick="gestionarEstudiantes('${asig.id}')" class="btn btn-sm btn-secondary">
                    Gestionar estudiantes
                </button>
                <button onclick="evaluarAsignatura('${asig.id}')" class="btn btn-sm btn-primary">
                    Evaluar con rúbrica
                </button>
                <button onclick="verProgresoAsignatura('${asig.id}')" class="btn btn-sm btn-outline">
                    Ver progreso
                </button>
            </div>

            <div style="margin-top: 15px; padding: 12px 15px; background: #FFF8E1; border: 1px dashed var(--naranja-warning); border-radius: 8px;">
                <div style="font-size: 0.85rem; color: var(--gris-oscuro); margin-bottom: 8px;">
                    <strong>Modo prueba:</strong> recorre el flujo como si fueras un estudiante. Las respuestas quedan separadas de los datos reales.
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="iniciarModoPrueba('${asig.id}')" class="btn btn-sm" style="background: var(--naranja-warning); color: white;">
                        ▶ Probar flujo como estudiante
                    </button>
                    <button onclick="verResultadosPrueba('${asig.id}')" class="btn btn-sm btn-outline">
                        Ver mis respuestas de prueba
                    </button>
                    <button onclick="reiniciarPrueba('${asig.id}')" class="btn btn-sm btn-outline" style="color: var(--rojo-error); border-color: var(--rojo-error);">
                        Reiniciar prueba
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Iniciar modo prueba: auto-inscribirse en estudiantes_test y abrir el panel de estudiante
async function iniciarModoPrueba(asignaturaId) {
    const asig = asignaturas.find(a => a.id === asignaturaId);
    if (!asig) return;

    // Pedir grupo para probar (el profesor elige con qué condición recorrer el flujo)
    const grupoElegido = window.prompt(
        'Elige el grupo con el que quieres recorrer el flujo de prueba:\n\n' +
        'A → Reto 1 SIN IA, Reto 2 CON IA\n' +
        'B → Reto 1 CON IA, Reto 2 SIN IA\n\n' +
        'Escribe A o B:',
        'A'
    );
    if (!grupoElegido) return;
    const grupo = grupoElegido.trim().toUpperCase();
    if (grupo !== 'A' && grupo !== 'B') {
        mostrarMensaje('Grupo no válido. Usa A o B.', 'error');
        return;
    }

    try {
        const email = currentUser.email;
        const ref = db.collection('asignaturas').doc(asignaturaId)
            .collection('estudiantes_test').doc(email);
        const doc = await ref.get();

        if (!doc.exists) {
            const codigoAnonimo = await generarCodigoAnonimo('TEST_' + email, asignaturaId);
            await ref.set({
                nombre: (currentUserData.nombre || email.split('@')[0]) + ' (prueba)',
                email,
                codigoAnonimo,
                grupo,
                esTest: true,
                profesorEmail: email,
                rolOriginal: 'profesor',
                fechaInscripcion: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (doc.data().grupo !== grupo) {
            // Permitir cambiar de grupo si aún no se ha completado nada
            const d = doc.data();
            if (d.completado_pre || d.completado_reto1 || d.completado_reto2 || d.completado_post) {
                mostrarMensaje('Ya hay respuestas de prueba registradas. Reinicia la prueba para cambiar de grupo.', 'warning');
                return;
            }
            await ref.update({ grupo });
        }

        window.location.href = 'estudiante.html?test=' + encodeURIComponent(asignaturaId);
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error iniciando modo prueba: ' + error.message, 'error');
    }
}

// Reiniciar prueba: borrar inscripción test y respuestas asociadas de este profesor
async function reiniciarPrueba(asignaturaId) {
    if (!confirm('¿Seguro? Se eliminarán la inscripción de prueba y todas tus respuestas de prueba en esta asignatura.')) return;

    try {
        const email = currentUser.email;

        // Borrar respuestas de este profesor en esta asignatura (esTest=true)
        const colecciones = ['respuestas_pre', 'respuestas_reto', 'respuestas_post'];
        let borradas = 0;
        for (const col of colecciones) {
            const snap = await db.collection(col)
                .where('esTest', '==', true)
                .where('asignaturaId', '==', asignaturaId)
                .where('profesorEmail', '==', email)
                .get();
            for (const d of snap.docs) {
                await d.ref.delete();
                borradas++;
            }
        }

        // Borrar inscripción test
        await db.collection('asignaturas').doc(asignaturaId)
            .collection('estudiantes_test').doc(email).delete();

        mostrarMensaje(`Prueba reiniciada (${borradas} respuestas eliminadas).`, 'success');
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error reiniciando prueba: ' + error.message, 'error');
    }
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
        const asigData = {
            nombre: form.nombre.value,
            titulacion: form.titulacion.value,
            curso: form.curso.value,
            esSimulacro: form.esSimulacro.checked,
            profesorEmail: currentUser.email,
            codigoInvitacion: generarCodigoInvitacion(),
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        // Asociar al centro del profesor
        if (currentCentro) {
            asigData.centroId = currentCentro.id;
            asigData.centroNombre = currentCentro.nombreCorto || currentCentro.nombre;
        }
        await db.collection('asignaturas').add(asigData);

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

    const grupoACount = estudiantes.filter(e => e.grupo === 'A').length;
    const grupoBCount = estudiantes.filter(e => e.grupo === 'B').length;
    const sinGrupo = estudiantes.filter(e => !e.grupo).length;

    container.innerHTML = `
        <div class="form-card">
            <h2>Estudiantes de ${asig.nombre}</h2>

            ${estudiantes.length === 0 ? '<p style="color: var(--gris-oscuro);">No hay estudiantes inscritos</p>' : `
                <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                    <span style="background: #e3f2fd; color: #1565c0; padding: 5px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Grupo A: ${grupoACount}</span>
                    <span style="background: #f3e5f5; color: #7b1fa2; padding: 5px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Grupo B: ${grupoBCount}</span>
                    ${sinGrupo > 0 ? `<span style="background: #FFF3E0; color: #E65100; padding: 5px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Sin asignar: ${sinGrupo}</span>` : ''}
                </div>

                <div class="table-container">
                    <table class="table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="text-align: left;">Estudiante</th>
                                <th style="text-align: center; width: 80px;">Grupo A</th>
                                <th style="text-align: center; width: 80px;">Grupo B</th>
                                <th style="width: 90px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${estudiantes.map(e => {
                                const bloqueado = e.grupo && (e.completado_pre || e.completado_reto1 || e.completado_reto2 || e.completado_post);
                                return `
                                <tr>
                                    <td>
                                        <strong>${e.nombre || e.email}</strong>
                                        <span style="color: var(--gris-oscuro); font-size: 0.8rem; display: block;">${e.email}</span>
                                    </td>
                                    <td style="text-align: center;">
                                        <input type="radio" name="grupo-${e.email}" value="A"
                                            ${e.grupo === 'A' ? 'checked' : ''}
                                            ${bloqueado ? 'disabled' : ''}
                                            data-email="${e.email}">
                                    </td>
                                    <td style="text-align: center;">
                                        <input type="radio" name="grupo-${e.email}" value="B"
                                            ${e.grupo === 'B' ? 'checked' : ''}
                                            ${bloqueado ? 'disabled' : ''}
                                            data-email="${e.email}">
                                    </td>
                                    <td style="text-align: center;">
                                        ${bloqueado
                                            ? '<span style="color: var(--gris-medio); font-size: 0.75rem;" title="Bloqueado: el estudiante ya ha respondido cuestionarios">🔒</span>'
                                            : `<button onclick="eliminarEstudiante('${asignaturaId}', '${e.email}')" class="btn btn-sm" style="background: var(--rojo-error); color: white; padding: 3px 8px; font-size: 0.75rem;">Eliminar</button>`
                                        }
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 15px;">
                    <button onclick="guardarGrupos('${asignaturaId}')" class="btn btn-primary">Guardar asignación de grupos</button>
                </div>
            `}

            <h3 style="margin-top: 30px;">Añadir estudiantes</h3>
            <form onsubmit="agregarEstudiantes(event, '${asignaturaId}')">
                <div class="form-group">
                    <label>Emails de estudiantes (uno por línea)</label>
                    <textarea name="emails" class="form-control" placeholder="estudiante1@alumnos.unex.es&#10;estudiante2@alumnos.unex.es" rows="4"></textarea>
                </div>
                <div style="display: flex; gap: 15px;">
                    <button type="button" onclick="cargarAsignaturas()" class="btn btn-outline">Volver</button>
                    <button type="submit" class="btn btn-secondary">Añadir estudiantes</button>
                </div>
            </form>
        </div>
    `;
}

async function agregarEstudiantes(event, asignaturaId) {
    event.preventDefault();
    const emails = event.target.emails.value.split('\n').map(e => e.trim().toLowerCase()).filter(e => e);

    // Validar dominios contra el centro del profesor
    if (currentCentro && currentCentro.dominios) {
        const emailsRechazados = [];
        for (const email of emails) {
            const dominio = extraerDominio(email);
            if (!dominio || currentCentro.dominios.indexOf(dominio) === -1) {
                emailsRechazados.push(email);
            }
        }
        if (emailsRechazados.length > 0) {
            const dominiosPermitidos = currentCentro.dominios.join(', @');
            mostrarMensaje(
                'Los siguientes emails no pertenecen a tu universidad (@' + dominiosPermitidos + '):<br>' +
                emailsRechazados.join('<br>'),
                'error'
            );
            return;
        }
    }

    try {
        const emailsOmitidos = [];
        const emailsYaExistentes = [];
        let añadidos = 0;

        for (const email of emails) {
            // Verificar si el usuario ya existe
            const userDoc = await db.collection('usuarios').doc(email).get();
            if (userDoc.exists) {
                const rolExistente = userDoc.data().rol;
                if (rolExistente === 'admin' || rolExistente === 'profesor') {
                    emailsOmitidos.push(email + ' (' + rolExistente + ')');
                    continue;
                }
                emailsYaExistentes.push(email);
            }

            // Verificar si ya está inscrito en esta asignatura
            const yaInscrito = await db.collection('asignaturas').doc(asignaturaId)
                .collection('estudiantes').doc(email).get();
            if (yaInscrito.exists) continue;

            const codigoAnonimo = await generarCodigoAnonimo(email, asignaturaId);

            // Solo crear documento de usuario si no existe
            if (!userDoc.exists) {
                const usuarioData = {
                    email,
                    rol: 'estudiante',
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (currentCentro) {
                    usuarioData.centroId = currentCentro.id;
                }
                await db.collection('usuarios').doc(email).set(usuarioData);
            }

            // Inscribir sin grupo (el profesor lo asignará después)
            await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').doc(email).set({
                nombre: email.split('@')[0],
                codigoAnonimo,
                grupo: null,
                fechaInscripcion: firebase.firestore.FieldValue.serverTimestamp()
            });
            añadidos++;
        }

        let msg = `${añadidos} estudiantes inscritos. Asigna los grupos desde "Gestionar estudiantes".`;
        if (emailsYaExistentes.length > 0) {
            msg += `<br><br>Ya registrados (inscritos en asignatura):<br>${emailsYaExistentes.join('<br>')}`;
        }
        if (emailsOmitidos.length > 0) {
            msg += `<br><br>Omitidos por tener rol superior:<br>${emailsOmitidos.join('<br>')}`;
        }
        mostrarMensaje(msg, emailsOmitidos.length > 0 ? 'warning' : 'success');
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

function renderAuditEstado(estudiante, sufijo, completado) {
    if (!completado) return '<span style="color: var(--gris-medio);">⬜</span>';

    const respondidas = estudiante[`audit_${sufijo}_respondidas`];
    const total = estudiante[`audit_${sufijo}_total`];
    const vacias = estudiante[`audit_${sufijo}_vacias`];
    const fecha = estudiante[`audit_${sufijo}_fecha`];

    if (typeof respondidas !== 'number' || typeof total !== 'number') {
        return '<span style="color: var(--verde-primario);">✅ Enviado</span>';
    }

    const color = vacias > 0 ? 'var(--naranja-warning)' : 'var(--verde-primario)';
    const detalleHuecos = vacias > 0 ? ` · ${vacias} en blanco` : ' · completo';
    const detalleFecha = fecha ? `<div style="color: var(--gris-medio); font-size: 0.75rem;">${formatearFecha(fecha)}</div>` : '';

    return `
        <div style="color: ${color}; font-weight: 600;">${respondidas}/${total}${detalleHuecos}</div>
        ${detalleFecha}
    `;
}

// Ver progreso de cuestionarios por asignatura
async function verProgresoAsignatura(asignaturaId) {
    const asig = asignaturas.find(a => a.id === asignaturaId);
    const container = document.getElementById('asignaturas-container');

    const estudiantesSnap = await db.collection('asignaturas').doc(asignaturaId).collection('estudiantes').get();
    const estudiantes = estudiantesSnap.docs.map(doc => ({ email: doc.id, ...doc.data() }));

    const totalPre = estudiantes.filter(e => e.completado_pre).length;
    const totalReto1 = estudiantes.filter(e => e.completado_reto1).length;
    const totalReto2 = estudiantes.filter(e => e.completado_reto2).length;
    const totalPost = estudiantes.filter(e => e.completado_post).length;
    const total = estudiantes.length;
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;

    container.innerHTML = `
        <div class="form-card">
            <h2>Progreso - ${asig.nombre}</h2>

            <div class="stats-grid" style="margin: 25px 0;">
                <div class="stat-card">
                    <div class="stat-number">${totalPre}/${total}</div>
                    <div class="stat-label">Cuestionario PRE</div>
                    <div style="background: var(--gris-claro); border-radius: 10px; height: 6px; margin-top: 8px;">
                        <div style="background: var(--verde-primario); width: ${pct(totalPre)}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalReto1}/${total}</div>
                    <div class="stat-label">Encuesta Reto 1</div>
                    <div style="background: var(--gris-claro); border-radius: 10px; height: 6px; margin-top: 8px;">
                        <div style="background: var(--verde-primario); width: ${pct(totalReto1)}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalReto2}/${total}</div>
                    <div class="stat-label">Encuesta Reto 2</div>
                    <div style="background: var(--gris-claro); border-radius: 10px; height: 6px; margin-top: 8px;">
                        <div style="background: var(--verde-primario); width: ${pct(totalReto2)}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalPost}/${total}</div>
                    <div class="stat-label">Cuestionario POST</div>
                    <div style="background: var(--gris-claro); border-radius: 10px; height: 6px; margin-top: 8px;">
                        <div style="background: var(--verde-primario); width: ${pct(totalPost)}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                </div>
            </div>

            <h3>Detalle por estudiante</h3>
            <p style="color: var(--gris-oscuro); margin-bottom: 12px; font-size: 0.9rem;">
                Las celdas muestran el número de ítems estructurados respondidos en cada cuestionario. No se expone el contenido de las respuestas.
            </p>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>Grupo</th>
                            <th>PRE</th>
                            <th>Reto 1</th>
                            <th>Reto 2</th>
                            <th>POST</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estudiantes.map(e => `
                            <tr>
                                <td>${e.nombre || e.email}</td>
                                <td><span style="background: ${e.grupo === 'A' ? '#e3f2fd' : '#f3e5f5'}; color: ${e.grupo === 'A' ? '#1565c0' : '#7b1fa2'}; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem;">${e.grupo || '?'}</span></td>
                                <td>${renderAuditEstado(e, 'pre', e.completado_pre)}</td>
                                <td>${renderAuditEstado(e, 'reto1', e.completado_reto1)}</td>
                                <td>${renderAuditEstado(e, 'reto2', e.completado_reto2)}</td>
                                <td>${renderAuditEstado(e, 'post', e.completado_post)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button onclick="cargarAsignaturas()" class="btn btn-outline">Volver</button>
            </div>
        </div>
    `;
}

// Guardar asignación manual de grupos
async function guardarGrupos(asignaturaId) {
    const radios = document.querySelectorAll(`input[type="radio"][data-email]`);
    const asignaciones = {};

    // Recoger selecciones (solo las no deshabilitadas)
    radios.forEach(radio => {
        if (!radio.disabled && radio.checked) {
            asignaciones[radio.dataset.email] = radio.value;
        }
    });

    if (Object.keys(asignaciones).length === 0) {
        mostrarMensaje('No hay cambios de grupo que guardar', 'info');
        return;
    }

    try {
        let actualizados = 0;
        for (const [email, grupo] of Object.entries(asignaciones)) {
            await db.collection('asignaturas').doc(asignaturaId)
                .collection('estudiantes').doc(email)
                .update({ grupo: grupo });
            actualizados++;
        }

        mostrarMensaje(actualizados + ' grupos asignados correctamente', 'success');
        gestionarEstudiantes(asignaturaId);

    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Copiar código de invitación al portapapeles
function copiarCodigo(codigo) {
    navigator.clipboard.writeText(codigo).then(() => {
        mostrarMensaje('Código copiado: ' + codigo, 'success');
    }).catch(() => {
        window.prompt('Copia este código:', codigo);
    });
}

// Generar código para asignaturas existentes que no tengan uno
async function generarCodigoParaAsignatura(asignaturaId) {
    try {
        const codigo = generarCodigoInvitacion();
        await db.collection('asignaturas').doc(asignaturaId).update({ codigoInvitacion: codigo });
        mostrarMensaje('Código generado: ' + codigo, 'success');
        cargarAsignaturas();
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Ver respuestas de prueba del propio profesor en esta asignatura
async function verResultadosPrueba(asignaturaId) {
    const asig = asignaturas.find(a => a.id === asignaturaId);
    const container = document.getElementById('asignaturas-container');
    container.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Cargando respuestas de prueba...</p></div>';

    try {
        const email = currentUser.email;
        const [preSnap, retoSnap, postSnap, inscDoc] = await Promise.all([
            db.collection('respuestas_pre')
                .where('esTest', '==', true)
                .where('asignaturaId', '==', asignaturaId)
                .where('profesorEmail', '==', email).get(),
            db.collection('respuestas_reto')
                .where('esTest', '==', true)
                .where('asignaturaId', '==', asignaturaId)
                .where('profesorEmail', '==', email).get(),
            db.collection('respuestas_post')
                .where('esTest', '==', true)
                .where('asignaturaId', '==', asignaturaId)
                .where('profesorEmail', '==', email).get(),
            db.collection('asignaturas').doc(asignaturaId)
                .collection('estudiantes_test').doc(email).get()
        ]);

        const insc = inscDoc.exists ? inscDoc.data() : null;
        const pre = preSnap.docs.map(d => d.data());
        const retos = retoSnap.docs.map(d => d.data()).sort((a, b) => (a.numeroReto || 0) - (b.numeroReto || 0));
        const post = postSnap.docs.map(d => d.data());

        container.innerHTML = `
            <div class="form-card">
                <h2>Respuestas de prueba — ${asig.nombre}</h2>
                <p style="color: var(--gris-oscuro);">Solo se muestran las respuestas con <code>esTest: true</code> generadas por ti.</p>

                ${insc ? `
                    <div class="alert alert-info" style="margin-top: 15px;">
                        Inscripción de prueba · Grupo <strong>${insc.grupo || '?'}</strong> ·
                        PRE: ${insc.completado_pre ? '✅' : '⬜'} ·
                        R1: ${insc.completado_reto1 ? '✅' : '⬜'} ·
                        R2: ${insc.completado_reto2 ? '✅' : '⬜'} ·
                        POST: ${insc.completado_post ? '✅' : '⬜'}
                    </div>
                ` : '<div class="alert alert-warning">No hay inscripción de prueba todavía.</div>'}

                ${renderBloqueRespuestas('Cuestionario PRE', pre)}
                ${renderBloqueRespuestas('Encuesta Reto 1', retos.filter(r => r.numeroReto === 1))}
                ${renderBloqueRespuestas('Encuesta Reto 2', retos.filter(r => r.numeroReto === 2))}
                ${renderBloqueRespuestas('Cuestionario POST', post)}

                <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="cargarAsignaturas()" class="btn btn-outline">Volver</button>
                    <button onclick="iniciarModoPrueba('${asignaturaId}')" class="btn btn-secondary">Reanudar prueba</button>
                    <button onclick="reiniciarPrueba('${asignaturaId}').then(() => cargarAsignaturas())" class="btn" style="color: var(--rojo-error); border-color: var(--rojo-error);">Reiniciar prueba</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-error">Error cargando respuestas de prueba: ${error.message}</div>`;
    }
}

function renderBloqueRespuestas(titulo, docs) {
    if (!docs || docs.length === 0) {
        return `<h3 style="margin-top: 20px;">${titulo}</h3><p style="color: var(--gris-medio);">Sin respuestas aún.</p>`;
    }
    return docs.map(d => `
        <h3 style="margin-top: 20px;">${titulo}${d.numeroReto ? ' (Reto ' + d.numeroReto + (d.condicion ? ' · ' + (d.condicion === 'con_ia' ? 'CON IA' : 'SIN IA') : '') + ')' : ''}</h3>
        <p style="color: var(--gris-oscuro); font-size: 0.85rem;">${d.fecha ? formatearFecha(d.fecha) : ''}</p>
        <div style="background: var(--gris-fondo); padding: 12px 15px; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 0.85rem; white-space: pre-wrap; overflow-x: auto;">${escaparHtml(JSON.stringify(d.respuestas || {}, null, 2))}</div>
    `).join('');
}

function escaparHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', initProfesorPanel);
