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
        case 'centros': cargarListaCentros(); break;
        case 'profesores': cargarProfesores(); break;
        case 'asignaturas': cargarTodasAsignaturas(); break;
        case 'respuestas': cargarRespuestas(); break;
        case 'exportar': prepararExportacion(); break;
    }
}

// Dashboard con estadísticas
async function cargarEstadisticas() {
    try {
        const [centros, profesores, asignaturas, respuestasPre, respuestasPost, rubricas] = await Promise.all([
            db.collection('centros').where('activo', '==', true).get(),
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

        document.getElementById('stat-centros').textContent = centros.size;
        document.getElementById('stat-profesores').textContent = profesores.size;
        document.getElementById('stat-asignaturas').textContent = asignaturas.size;
        document.getElementById('stat-estudiantes').textContent = totalEstudiantes;
        document.getElementById('stat-respuestas').textContent = respuestasPre.size + respuestasPost.size;
        document.getElementById('stat-rubricas').textContent = rubricas.size;

        // Progreso por asignatura
        const dashboardSection = document.getElementById('seccion-dashboard');
        // Eliminar progreso anterior si existe
        const oldProgreso = document.getElementById('progreso-asignaturas');
        if (oldProgreso) oldProgreso.remove();

        let progresoHtml = '<div id="progreso-asignaturas" style="margin: 25px 0;"><h3 style="margin-bottom: 15px;">Progreso por asignatura</h3>';
        for (const asigDoc of asignaturas.docs) {
            const asigData = asigDoc.data();
            const estudiantesSnap = await db.collection('asignaturas').doc(asigDoc.id).collection('estudiantes').get();
            const estList = estudiantesSnap.docs.map(function(d) { return d.data(); });
            const t = estList.length;
            if (t === 0) continue;

            const pre = estList.filter(function(e) { return e.completado_pre; }).length;
            const r1 = estList.filter(function(e) { return e.completado_reto1; }).length;
            const r2 = estList.filter(function(e) { return e.completado_reto2; }).length;
            const post = estList.filter(function(e) { return e.completado_post; }).length;

            progresoHtml += '<div style="background: var(--gris-fondo); padding: 15px; border-radius: 8px; margin-bottom: 10px;">' +
                '<strong>' + asigData.nombre + '</strong> <span style="color: var(--gris-oscuro); font-size: 0.85rem;">(' + t + ' estudiantes)</span>' +
                '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">' +
                ['PRE:' + pre, 'Reto1:' + r1, 'Reto2:' + r2, 'POST:' + post].map(function(label, i) {
                    var n = [pre, r1, r2, post][i];
                    var color = (i === 0 || i === 3) ? 'var(--verde-primario)' : 'var(--azul-info)';
                    return '<div><div style="font-size: 0.75rem; color: var(--gris-oscuro);">' + label + '/' + t + '</div>' +
                        '<div style="background: var(--gris-claro); border-radius: 4px; height: 6px; margin-top: 4px;">' +
                        '<div style="background: ' + color + '; width: ' + Math.round((n/t)*100) + '%; height: 100%; border-radius: 4px;"></div></div></div>';
                }).join('') +
                '</div></div>';
        }
        progresoHtml += '</div>';

        const actividadH3 = dashboardSection.querySelector('h3');
        if (actividadH3) {
            actividadH3.insertAdjacentHTML('beforebegin', progresoHtml);
        }

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

// --- Gestión de centros ---

async function cargarListaCentros() {
    const container = document.getElementById('lista-centros');
    container.innerHTML = '<p>Cargando...</p>';

    try {
        const snapshot = await db.collection('centros').get();
        const centros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (centros.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay centros registrados. Registra el primer centro arriba.</div>';
            return;
        }

        container.innerHTML = centros.map(c => `
            <div class="form-card" style="margin-bottom: 12px; opacity: ${c.activo ? 1 : 0.6};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3>${c.nombre} <span style="color: var(--gris-oscuro); font-weight: 400; font-size: 0.9rem;">(${c.nombreCorto})</span></h3>
                        <p style="color: var(--gris-oscuro); font-size: 0.9rem;">
                            📍 ${c.pais} · 📧 @${(c.dominios || []).join(', @')}
                        </p>
                        ${c.contacto ? '<p style="color: var(--gris-oscuro); font-size: 0.85rem;">Contacto: ' + (c.contacto.nombre || '') + ' (' + (c.contacto.email || '') + ')</p>' : ''}
                        ${c.titulaciones ? '<p style="color: var(--gris-oscuro); font-size: 0.85rem;">Titulaciones: ' + c.titulaciones.join(', ') + '</p>' : ''}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="background: ${c.activo ? 'var(--verde-primario)' : 'var(--gris-medio)'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem;">
                            ${c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <button onclick="toggleCentro('${c.id}', ${!c.activo})" class="btn btn-sm btn-outline">
                            ${c.activo ? 'Desactivar' : 'Activar'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">Error al cargar centros</div>';
    }
}

async function agregarCentro(event) {
    event.preventDefault();
    const form = event.target;

    const dominiosRaw = form.dominios.value.split(',').map(d => d.trim().toLowerCase().replace(/^@/, '')).filter(d => d);
    if (dominiosRaw.length === 0) {
        mostrarMensaje('Debes indicar al menos un dominio de email', 'error');
        return;
    }

    // Verificar que los dominios no estén ya registrados en otro centro
    try {
        const existentes = await db.collection('centros').get();
        for (const doc of existentes.docs) {
            const centroExistente = doc.data();
            for (const dominio of dominiosRaw) {
                if (centroExistente.dominios && centroExistente.dominios.indexOf(dominio) !== -1) {
                    mostrarMensaje('El dominio @' + dominio + ' ya está registrado en "' + centroExistente.nombre + '"', 'error');
                    return;
                }
            }
        }
    } catch (error) {
        // Continuar si falla la verificación
    }

    const titulacionesRaw = form.titulaciones.value.trim();
    const titulaciones = titulacionesRaw
        ? titulacionesRaw.split(',').map(t => t.trim()).filter(t => t)
        : TITULACIONES_DEFAULT;

    const centroData = {
        nombre: form.nombre.value.trim(),
        nombreCorto: form.nombreCorto.value.trim(),
        pais: form.pais.value.trim(),
        dominios: dominiosRaw,
        titulaciones: titulaciones,
        cursos: CURSOS_DEFAULT,
        activo: true,
        fechaAlta: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (form.contactoNombre.value.trim() || form.contactoEmail.value.trim()) {
        centroData.contacto = {
            nombre: form.contactoNombre.value.trim(),
            email: form.contactoEmail.value.trim()
        };
    }

    try {
        await db.collection('centros').add(centroData);
        mostrarMensaje('Centro "' + centroData.nombre + '" registrado correctamente', 'success');
        form.reset();
        // Invalidar caché de centros
        _centrosCacheTimestamp = 0;
        cargarListaCentros();
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function toggleCentro(centroId, nuevoEstado) {
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    if (!confirm('¿' + accion.charAt(0).toUpperCase() + accion.slice(1) + ' este centro? ' +
        (nuevoEstado ? '' : 'Los profesores y estudiantes de este centro no podrán acceder.'))) return;

    try {
        await db.collection('centros').doc(centroId).update({ activo: nuevoEstado });
        _centrosCacheTimestamp = 0;
        mostrarMensaje('Centro ' + accion + 'do', 'success');
        cargarListaCentros();
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// Poblar selector de centros en el form de profesores
async function poblarSelectorCentros() {
    const select = document.getElementById('select-centro-profesor');
    if (!select) return;

    try {
        const centros = await cargarCentros(true);
        select.innerHTML = '<option value="">Selecciona centro...</option>';
        centros.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombreCorto + ' - ' + c.nombre;
            opt.dataset.dominios = (c.dominios || []).join(',');
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error cargando centros para selector:', error);
    }
}

// --- Gestión de profesores ---

async function cargarProfesores() {
    const container = document.getElementById('lista-profesores');
    container.innerHTML = '<p>Cargando...</p>';

    // Cargar selector de centros
    await poblarSelectorCentros();

    try {
        const snapshot = await db.collection('usuarios').where('rol', '==', 'profesor').get();
        const profesores = snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));

        if (profesores.length === 0) {
            container.innerHTML = '<p style="color: var(--gris-oscuro);">No hay profesores registrados</p>';
            return;
        }

        // Cargar nombres de centros para mostrar
        const centros = await cargarCentros();
        const centroMap = {};
        centros.forEach(function(c) { centroMap[c.id] = c.nombreCorto || c.nombre; });

        container.innerHTML = profesores.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--gris-fondo); border-radius: 6px; margin-bottom: 8px;">
                <div>
                    <strong>${p.nombre || p.email}</strong>
                    <span style="color: var(--gris-oscuro); font-size: 0.85rem;"> - ${p.email}</span>
                    ${p.centroId ? '<span style="background: #EBF8FF; color: #2B6CB0; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-left: 8px;">' + (centroMap[p.centroId] || p.centroId) + '</span>' : ''}
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
    const centroId = form.centroId.value;

    if (!centroId) {
        mostrarMensaje('Selecciona un centro', 'error');
        return;
    }

    // Validar que el email pertenece al centro seleccionado
    const select = form.centroId;
    const dominiosStr = select.options[select.selectedIndex].dataset.dominios;
    const dominios = dominiosStr ? dominiosStr.split(',') : [];
    const dominio = extraerDominio(email);

    if (dominios.length > 0 && dominios.indexOf(dominio) === -1) {
        mostrarMensaje('El email @' + dominio + ' no pertenece al centro seleccionado (dominios permitidos: @' + dominios.join(', @') + ')', 'error');
        return;
    }

    try {
        await db.collection('usuarios').doc(email).set({
            email,
            nombre,
            rol: 'profesor',
            centroId,
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

        document.getElementById('modal-titulo').textContent = 'Detalle - Cuestionario ' + tipo;

        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        for (const [key, value] of Object.entries(data)) {
            if (key === 'respuestas' && typeof value === 'object') {
                html += '<div style="background: var(--gris-fondo); padding: 15px; border-radius: 8px;">';
                html += '<strong style="color: var(--azul-primario);">Respuestas</strong>';
                for (const [rKey, rVal] of Object.entries(value)) {
                    const displayVal = Array.isArray(rVal) ? rVal.join(', ') : rVal;
                    html += '<div style="margin-top: 8px; padding: 8px; background: white; border-radius: 6px;"><span style="font-weight: 500;">' + rKey + ':</span> ' + displayVal + '</div>';
                }
                html += '</div>';
            } else {
                const displayValue = value && value.toDate ? value.toDate().toLocaleString('es-ES') : value;
                html += '<div style="padding: 10px; background: var(--gris-fondo); border-radius: 6px;"><span style="font-weight: 600; color: var(--azul-primario);">' + key + ':</span> ' + displayValue + '</div>';
            }
        }
        html += '</div>';

        document.getElementById('modal-contenido').innerHTML = html;
        const modal = document.getElementById('modal-detalle');
        modal.style.display = 'flex';
        modal.onclick = function(e) { if (e.target === modal) cerrarModal(); };
    } catch (error) {
        mostrarMensaje('Error al cargar detalle', 'error');
    }
}

function cerrarModal() {
    document.getElementById('modal-detalle').style.display = 'none';
}

// Exportación de datos
async function prepararExportacion() {
    // JSON
    document.getElementById('btn-exportar-pre').onclick = () => exportarColeccion('respuestas_pre', 'cuestionarios_pre.json');
    document.getElementById('btn-exportar-post').onclick = () => exportarColeccion('respuestas_post', 'cuestionarios_post.json');
    document.getElementById('btn-exportar-retos').onclick = () => exportarColeccion('respuestas_reto', 'encuestas_reto.json');
    document.getElementById('btn-exportar-rubricas').onclick = () => exportarColeccion('rubricas', 'rubricas.json');
    // CSV
    document.getElementById('btn-exportar-pre-csv').onclick = () => exportarColeccion('respuestas_pre', 'cuestionarios_pre.csv', 'csv');
    document.getElementById('btn-exportar-post-csv').onclick = () => exportarColeccion('respuestas_post', 'cuestionarios_post.csv', 'csv');
    document.getElementById('btn-exportar-retos-csv').onclick = () => exportarColeccion('respuestas_reto', 'encuestas_reto.csv', 'csv');
    document.getElementById('btn-exportar-rubricas-csv').onclick = () => exportarColeccion('rubricas', 'rubricas.csv', 'csv');

    document.getElementById('btn-exportar-todo').onclick = exportarTodo;
}

async function exportarColeccion(nombre, archivo, formato = 'json') {
    try {
        const snapshot = await db.collection(nombre).get();
        const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (formato === 'csv') {
            descargarCSV(datos, archivo.replace('.json', '.csv'));
        } else {
            descargarJSON(datos, archivo);
        }
        mostrarMensaje('Exportados ' + datos.length + ' registros en ' + formato.toUpperCase(), 'success');
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

function descargarCSV(datos, nombreArchivo) {
    if (!datos.length) {
        mostrarMensaje('No hay datos para exportar', 'warning');
        return;
    }

    const flattenObj = (obj, prefix) => {
        prefix = prefix || '';
        const result = {};
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && !(obj[key].toDate)) {
                Object.assign(result, flattenObj(obj[key], prefix + key + '.'));
            } else if (obj[key] && obj[key].toDate) {
                result[prefix + key] = obj[key].toDate().toISOString();
            } else if (Array.isArray(obj[key])) {
                result[prefix + key] = obj[key].join('; ');
            } else {
                result[prefix + key] = obj[key];
            }
        }
        return result;
    };

    const flatData = datos.map(function(d) { return flattenObj(d); });
    const headersSet = new Set();
    flatData.forEach(function(row) { Object.keys(row).forEach(function(k) { headersSet.add(k); }); });
    const headers = Array.from(headersSet);

    const csvContent = [
        headers.join(','),
        ...flatData.map(function(row) {
            return headers.map(function(h) {
                const val = row[h] !== undefined ? String(row[h]) : '';
                return (val.includes(',') || val.includes('"') || val.includes('\n'))
                    ? '"' + val.replace(/"/g, '""') + '"'
                    : val;
            }).join(',');
        })
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
