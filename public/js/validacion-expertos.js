const CRITERIOS_BASE = ['relevancia', 'claridad', 'coherencia'];

const INSTRUMENTOS = [
    {
        id: 'pretest',
        titulo: 'Instrumento 1. Cuestionario pre-test',
        objetivos: [
            'Caracterizar al alumnado antes de la intervención.',
            'Recoger experiencia previa con IA generativa.',
            'Incorporar variables de contexto útiles para interpretar diferencias posteriores.'
        ],
        criterios: CRITERIOS_BASE,
        items: [
            {
                codigo: 'PRE-01',
                texto: 'Frecuencia de uso previo de herramientas de IA generativa',
                detalle: 'Pregunta de caracterización sobre la frecuencia con la que el estudiante usa ChatGPT, Copilot o herramientas similares antes del experimento.'
            },
            {
                codigo: 'PRE-02',
                texto: 'Autopercepción de competencia en el uso de IA generativa',
                detalle: 'Ítem de autoevaluación para estimar hasta qué punto el estudiante considera que sabe formular prompts, interpretar respuestas y usar la IA con criterio.'
            },
            {
                codigo: 'PRE-03',
                texto: 'Actitud hacia el uso de IA en educación superior',
                detalle: 'Bloque actitudinal sobre aceptación, utilidad percibida y predisposición a incorporar IA generativa en contextos universitarios.'
            },
            {
                codigo: 'PRE-04',
                texto: 'Autopercepción de dominio de la materia antes del experimento',
                detalle: 'Pregunta basal para estimar la confianza del estudiante en su propio conocimiento disciplinar antes de resolver los retos.'
            },
            {
                codigo: 'PRE-05',
                texto: 'Experiencia previa con tareas similares a los retos del estudio',
                detalle: 'Ítem sobre familiaridad previa con problemas, ejercicios o dinámicas comparables a las dos tareas que se usarán en el crossover.'
            }
        ]
    },
    {
        id: 'postReto',
        titulo: 'Instrumento 2. Encuesta post-reto',
        objetivos: [
            'Recoger la percepción inmediata tras cada reto.',
            'Documentar dificultad, confianza, utilidad percibida y tiempo.',
            'Describir el uso de la herramienta en la condición con IA.'
        ],
        criterios: CRITERIOS_BASE,
        items: [
            {
                codigo: 'POSR-01',
                texto: 'Dificultad percibida del reto',
                detalle: 'Valoración inmediata de cuán difícil ha resultado la tarea concreta justo después de completarla.'
            },
            {
                codigo: 'POSR-02',
                texto: 'Confianza en la solución entregada',
                detalle: 'Ítem sobre seguridad subjetiva del estudiante respecto a la calidad o corrección de la respuesta que ha presentado.'
            },
            {
                codigo: 'POSR-03',
                texto: 'Utilidad percibida de los recursos disponibles',
                detalle: 'Pregunta transversal para valorar si los recursos ofrecidos en cada condición han sido suficientes y realmente útiles para resolver el reto.'
            },
            {
                codigo: 'POSR-04',
                texto: 'Tiempo percibido como suficiente o insuficiente',
                detalle: 'Ítem de ajuste temporal para detectar si la duración de la actividad condiciona el desempeño o la satisfacción con la tarea.'
            },
            {
                codigo: 'POSR-05',
                texto: 'En condición IA: utilidad de las respuestas generadas',
                detalle: 'Pregunta específica de la condición con IA sobre el valor práctico de las respuestas ofrecidas por la herramienta durante la resolución.'
            },
            {
                codigo: 'POSR-06',
                texto: 'En condición IA: grado de dependencia de la herramienta',
                detalle: 'Ítem para estimar si el estudiante usó la IA como apoyo puntual o como recurso central y difícilmente sustituible.'
            },
            {
                codigo: 'POSR-07',
                texto: 'En condición sin IA: percepción de desventaja por ausencia de la herramienta',
                detalle: 'Pregunta espejo para detectar si, al trabajar sin IA, el estudiante siente que compite o aprende en peores condiciones.'
            }
        ]
    },
    {
        id: 'posttest',
        titulo: 'Instrumento 3. Cuestionario post-test',
        objetivos: [
            'Recoger la comparación retrospectiva entre condiciones.',
            'Documentar preferencia y percepción de aprendizaje.',
            'Obtener comentarios abiertos sobre el efecto de la IA en el razonamiento y el flujo de trabajo.'
        ],
        criterios: CRITERIOS_BASE,
        items: [
            {
                codigo: 'POST-01',
                texto: 'Preferencia global entre condición con IA y sin IA',
                detalle: 'Comparación retrospectiva final para saber en qué modalidad preferiría trabajar el estudiante una vez vividas ambas experiencias.'
            },
            {
                codigo: 'POST-02',
                texto: 'Percepción de apoyo al aprendizaje en cada condición',
                detalle: 'Ítem comparativo para estimar en cuál de las dos condiciones el estudiante siente haber aprendido más o mejor.'
            },
            {
                codigo: 'POST-03',
                texto: 'Cambio de actitud hacia la IA tras completar ambos retos',
                detalle: 'Pregunta de cierre sobre posible cambio de percepción hacia la IA después de haberla usado y de haber trabajado también sin ella.'
            },
            {
                codigo: 'POST-04',
                texto: 'Pregunta abierta sobre influencia de la IA en el razonamiento',
                detalle: 'Respuesta abierta destinada a recoger si la IA ayudó, entorpeció o transformó el modo de pensar el problema.'
            },
            {
                codigo: 'POST-05',
                texto: 'Pregunta abierta sobre influencia de la IA en la confianza o el flujo de trabajo',
                detalle: 'Comentario final sobre cómo la IA afectó a la seguridad subjetiva del estudiante y a su manera de organizar el trabajo.'
            }
        ]
    },
    {
        id: 'rubrica',
        titulo: 'Instrumento 4. Rúbrica de evaluación',
        objetivos: [
            'Evaluar el desempeño académico de forma estructurada.',
            'Mantener comparabilidad entre tareas y entre docentes.',
            'Valorar si los criterios pueden aplicarse de forma consistente al corregir.'
        ],
        criterios: [...CRITERIOS_BASE, 'operatividad'],
        items: [
            {
                codigo: 'RUB-01',
                texto: 'Corrección técnica',
                detalle: 'Criterio para valorar si la solución es técnicamente correcta y respeta los conceptos, cálculos o procedimientos propios de la materia.'
            },
            {
                codigo: 'RUB-02',
                texto: 'Profundidad del análisis',
                detalle: 'Evalúa el nivel de elaboración de la respuesta, su capacidad para ir más allá de lo superficial y su tratamiento razonado del problema.'
            },
            {
                codigo: 'RUB-03',
                texto: 'Calidad de la justificación',
                detalle: 'Mide si el estudiante explica por qué propone una solución, con argumentos comprensibles y trazables.'
            },
            {
                codigo: 'RUB-04',
                texto: 'Presentación / comunicación de la solución',
                detalle: 'Criterio sobre claridad expositiva, estructura de la respuesta y facilidad para que un docente siga el razonamiento presentado.'
            }
        ]
    }
];

let usuarioActual = null;
let perfilActual = null;
let docRef = null;

function crearOpcionesEscala(name, selectedValue) {
    let html = '';
    for (let valor = 1; valor <= 5; valor++) {
        const checked = Number(selectedValue) === valor ? 'checked' : '';
        html += `<option value="${valor}" ${checked}>${valor}</option>`;
    }
    return html;
}

function renderTablaInstrumento(instrumento, datosPrevios) {
    const valoraciones = (datosPrevios && datosPrevios.valoraciones) || {};
    const summary = (datosPrevios && datosPrevios.summary) || {};

    const criteriosLabels = {
        relevancia: 'Relevancia',
        claridad: 'Claridad',
        coherencia: 'Coherencia',
        operatividad: 'Operatividad'
    };

    const summaryLabels = {
        cobertura: 'Cobertura suficiente del instrumento',
        redundantes: instrumento.id === 'rubrica' ? 'Criterios redundantes o sobrantes' : 'Ítems redundantes o sobrantes',
        ausentes: instrumento.id === 'rubrica' ? 'Criterios ausentes' : 'Ítems ausentes',
        recomendaciones: 'Recomendaciones'
    };

    const criteriosCols = instrumento.criterios.map((criterio) =>
        `<th style="text-align:center; min-width: 120px;">${criteriosLabels[criterio]}<br><span style="font-weight:400; opacity:0.85;">(1-5)</span></th>`
    ).join('');

    const filas = instrumento.items.map((item) => {
        const itemPrevio = valoraciones[item.codigo] || {};
        const celdasCriterio = instrumento.criterios.map((criterio) => `
            <td style="text-align:center;">
                <select class="form-control" required name="${instrumento.id}__${item.codigo}__${criterio}">
                    <option value="">-</option>
                    ${crearOpcionesEscala(`${instrumento.id}__${item.codigo}__${criterio}`, itemPrevio[criterio])}
                </select>
            </td>
        `).join('');

        return `
            <tr>
                <td>
                    <strong>${item.codigo}</strong>
                    <div style="color: var(--gris-oscuro); font-size: 0.9rem; margin-top: 4px;">${item.texto}</div>
                    <div style="color: var(--gris-medio); font-size: 0.82rem; line-height: 1.45; margin-top: 6px;">${item.detalle || ''}</div>
                </td>
                ${celdasCriterio}
                <td>
                    <textarea class="form-control" name="${instrumento.id}__${item.codigo}__comentarios" style="min-height: 90px;">${itemPrevio.comentarios || ''}</textarea>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="form-card">
            <h2>${instrumento.titulo}</h2>
            <div class="instrument-intro">
                <h3>Objetivo del instrumento</h3>
                <ul>
                    ${instrumento.objetivos.map((objetivo) => `<li>${objetivo}</li>`).join('')}
                </ul>
                <p class="mini-note">Cada ítem se resume con una glosa operativa para facilitar la valoración sin necesidad de tener delante el cuestionario completo. Escala recomendada: 1 = muy deficiente / no adecuado, 5 = muy adecuado. Añade comentarios siempre que detectes ambigüedad, redundancia o falta de ajuste al objetivo del estudio.</p>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Ítem</th>
                            ${criteriosCols}
                            <th style="min-width: 240px;">Comentarios</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas}
                    </tbody>
                </table>
            </div>
            <div class="instrument-grid mt-2">
                <div class="form-group">
                    <label class="required" for="${instrumento.id}__cobertura">${summaryLabels.cobertura}</label>
                    <select class="form-control" id="${instrumento.id}__cobertura" name="${instrumento.id}__cobertura" required>
                        <option value="">Selecciona…</option>
                        <option value="si" ${summary.cobertura === 'si' ? 'selected' : ''}>Sí</option>
                        <option value="no" ${summary.cobertura === 'no' ? 'selected' : ''}>No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="${instrumento.id}__redundantes">${summaryLabels.redundantes}</label>
                    <textarea class="form-control" id="${instrumento.id}__redundantes" name="${instrumento.id}__redundantes">${summary.redundantes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="${instrumento.id}__ausentes">${summaryLabels.ausentes}</label>
                    <textarea class="form-control" id="${instrumento.id}__ausentes" name="${instrumento.id}__ausentes">${summary.ausentes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="${instrumento.id}__recomendaciones">${summaryLabels.recomendaciones}</label>
                    <textarea class="form-control" id="${instrumento.id}__recomendaciones" name="${instrumento.id}__recomendaciones">${summary.recomendaciones || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function renderInstrumentos(datosPrevios) {
    const container = document.getElementById('instrumentos-container');
    container.innerHTML = INSTRUMENTOS.map((instrumento) =>
        renderTablaInstrumento(instrumento, datosPrevios ? datosPrevios[instrumento.id] : null)
    ).join('');
}

function actualizarEstado(docData) {
    const estado = document.getElementById('estado-formulario');
    const ultima = document.getElementById('ultima-actualizacion');

    if (docData && docData.updatedAt) {
        estado.textContent = 'Borrador disponible';
        ultima.textContent = `Última actualización: ${formatearFecha(docData.updatedAt)}`;
    } else {
        estado.textContent = 'Sin respuesta previa';
        ultima.textContent = 'Todavía no se ha guardado ninguna versión en Firestore.';
    }
}

function cargarDatosBasicos(data) {
    document.getElementById('nombre').value = data?.nombre || perfilActual.nombre || usuarioActual.email;
    document.getElementById('email').value = usuarioActual.email;
    document.getElementById('areaDepartamento').value = data?.areaDepartamento || '';
    document.getElementById('perfil').value = data?.perfil || '';
    document.getElementById('anosDocencia').value = data?.anosDocencia ?? '';
    document.getElementById('anosInvestigacion').value = data?.anosInvestigacion ?? '';
    document.getElementById('usoIADocencia').value = data?.usoIADocencia || '';
    document.getElementById('fortalezas').value = data?.fortalezas || '';
    document.getElementById('debilidades').value = data?.debilidades || '';
    document.getElementById('cambiosImprescindibles').value = data?.cambiosImprescindibles || '';
    document.getElementById('cambiosRecomendables').value = data?.cambiosRecomendables || '';
}

async function cargarFormularioPrevio() {
    const doc = await docRef.get();
    if (!doc.exists) {
        renderInstrumentos(null);
        cargarDatosBasicos(null);
        actualizarEstado(null);
        return;
    }

    const data = doc.data();
    renderInstrumentos(data.instrumentos || null);
    cargarDatosBasicos(data);
    actualizarEstado(data);
}

function construirPayloadDesdeFormulario() {
    const form = document.getElementById('form-validacion-expertos');

    const payload = {
        nombre: form.nombre.value.trim(),
        email: usuarioActual.email,
        areaDepartamento: form.areaDepartamento.value.trim(),
        perfil: form.perfil.value,
        anosDocencia: Number(form.anosDocencia.value),
        anosInvestigacion: Number(form.anosInvestigacion.value),
        usoIADocencia: form.usoIADocencia.value,
        fortalezas: form.fortalezas.value.trim(),
        debilidades: form.debilidades.value.trim(),
        cambiosImprescindibles: form.cambiosImprescindibles.value.trim(),
        cambiosRecomendables: form.cambiosRecomendables.value.trim(),
        instrumentos: {},
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    INSTRUMENTOS.forEach((instrumento) => {
        const dataInstrumento = {
            valoraciones: {},
            summary: {
                cobertura: form[`${instrumento.id}__cobertura`].value,
                redundantes: form[`${instrumento.id}__redundantes`].value.trim(),
                ausentes: form[`${instrumento.id}__ausentes`].value.trim(),
                recomendaciones: form[`${instrumento.id}__recomendaciones`].value.trim()
            }
        };

        instrumento.items.forEach((item) => {
            const valoracion = {
                comentarios: form[`${instrumento.id}__${item.codigo}__comentarios`].value.trim()
            };
            instrumento.criterios.forEach((criterio) => {
                valoracion[criterio] = Number(form[`${instrumento.id}__${item.codigo}__${criterio}`].value);
            });
            dataInstrumento.valoraciones[item.codigo] = valoracion;
        });

        payload.instrumentos[instrumento.id] = dataInstrumento;
    });

    return payload;
}

async function guardarFormulario(event) {
    event.preventDefault();

    const boton = document.getElementById('btn-guardar');
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    try {
        const payload = construirPayloadDesdeFormulario();
        const previo = await docRef.get();

        if (!previo.exists) {
            payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            payload.createdBy = usuarioActual.email;
            payload.rol = perfilActual.rol || 'profesor';
        }

        await docRef.set(payload, { merge: true });
        mostrarMensaje('Valoración guardada correctamente. Puedes volver más tarde y seguir editando.', 'success');
        await cargarFormularioPrevio();
    } catch (error) {
        console.error(error);
        mostrarMensaje('No se pudo guardar el formulario: ' + error.message, 'error');
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar valoración';
    }
}

async function initValidacionExpertos() {
    try {
        const { user, userData } = await verificarAuth('profesor');
        usuarioActual = user;
        perfilActual = userData;
        docRef = db.collection('validacion_instrumentos').doc(user.email);

        document.getElementById('user-email').textContent = user.email;
        renderInstrumentos(null);
        cargarDatosBasicos(null);
        await cargarFormularioPrevio();

        document.getElementById('form-validacion-expertos').addEventListener('submit', guardarFormulario);
    } catch (error) {
        console.error(error);
        mostrarMensaje(error, 'error');
        setTimeout(() => {
            window.location.href = '/app/login.html';
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', initValidacionExpertos);
