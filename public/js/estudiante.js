// Lógica del panel de estudiante

let currentUser = null;
let currentUserData = null;
let inscripciones = [];

// Inicializar panel de estudiante
async function initEstudiantePanel() {
    try {
        const { user, userData } = await verificarAuth('estudiante');
        currentUser = user;
        currentUserData = userData;

        // Mostrar info del usuario
        document.getElementById('user-name').textContent = userData.nombre || user.email;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-avatar').textContent = (userData.nombre || user.email).charAt(0).toUpperCase();

        // Cargar inscripciones (asignaturas del estudiante)
        await cargarInscripciones();

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error, 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}

// Cargar asignaturas en las que está inscrito el estudiante
async function cargarInscripciones() {
    const container = document.getElementById('asignaturas-container');
    container.innerHTML = '<p>Cargando asignaturas...</p>';

    try {
        // Buscar en todas las asignaturas si este estudiante está inscrito
        const asignaturasSnapshot = await db.collection('asignaturas').get();
        inscripciones = [];

        for (const asigDoc of asignaturasSnapshot.docs) {
            const estudianteDoc = await db.collection('asignaturas')
                .doc(asigDoc.id)
                .collection('estudiantes')
                .doc(currentUser.email)
                .get();

            if (estudianteDoc.exists) {
                inscripciones.push({
                    asignaturaId: asigDoc.id,
                    asignatura: asigDoc.data(),
                    estudiante: estudianteDoc.data()
                });
            }
        }

        if (inscripciones.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    No estás inscrito en ninguna asignatura del proyecto.<br>
                    Si crees que deberías estarlo, contacta con tu profesor.
                </div>
            `;
            return;
        }

        // Mostrar asignaturas y estado de cuestionarios
        let html = '';
        for (const insc of inscripciones) {
            const estado = await obtenerEstadoCuestionarios(insc.asignaturaId, insc.estudiante.codigoAnonimo);
            html += renderAsignaturaCard(insc, estado);
        }
        container.innerHTML = html;

    } catch (error) {
        console.error('Error cargando inscripciones:', error);
        container.innerHTML = '<div class="alert alert-error">Error al cargar las asignaturas</div>';
    }
}

// Obtener estado de cuestionarios completados (lee del documento de inscripción)
async function obtenerEstadoCuestionarios(asignaturaId, codigoAnonimo) {
    const estado = {
        pre: false,
        reto1: false,
        reto2: false,
        post: false
    };

    try {
        const estudianteDoc = await db.collection('asignaturas')
            .doc(asignaturaId)
            .collection('estudiantes')
            .doc(currentUser.email)
            .get();

        if (estudianteDoc.exists) {
            const data = estudianteDoc.data();
            estado.pre = data.completado_pre || false;
            estado.reto1 = data.completado_reto1 || false;
            estado.reto2 = data.completado_reto2 || false;
            estado.post = data.completado_post || false;
        }
    } catch (error) {
        console.error('Error obteniendo estado:', error);
    }

    return estado;
}

// Renderizar tarjeta de asignatura
function renderAsignaturaCard(insc, estado) {
    const completados = [estado.pre, estado.reto1, estado.reto2, estado.post].filter(Boolean).length;
    const porcentaje = (completados / 4) * 100;

    return `
        <div class="form-card">
            <h2>${insc.asignatura.nombre}</h2>
            <p style="color: var(--gris-oscuro); margin-bottom: 20px;">
                ${insc.asignatura.titulacion} · ${insc.asignatura.curso}
                ${insc.asignatura.esSimulacro ? '<span style="color: var(--naranja-warning);"> (Simulacro)</span>' : ''}
                ${insc.estudiante.grupo ? '<br><span style="background: ' + (insc.estudiante.grupo === 'A' ? '#e3f2fd' : '#f3e5f5') + '; color: ' + (insc.estudiante.grupo === 'A' ? '#1565c0' : '#7b1fa2') + '; padding: 3px 10px; border-radius: 10px; font-size: 0.85rem; font-weight: 600;">Grupo ' + insc.estudiante.grupo + ' — Reto 1: ' + (insc.estudiante.grupo === 'A' ? 'SIN IA' : 'CON IA') + ' · Reto 2: ' + (insc.estudiante.grupo === 'A' ? 'CON IA' : 'SIN IA') + '</span>' : ''}
            </p>

            <div style="background: var(--gris-claro); border-radius: 20px; height: 10px; margin-bottom: 20px;">
                <div style="background: var(--verde-primario); width: ${porcentaje}%; height: 100%; border-radius: 20px; transition: width 0.3s;"></div>
            </div>
            <p style="text-align: center; color: var(--gris-oscuro); margin-bottom: 20px;">${completados}/4 completados</p>

            <div class="cards-grid">
                ${renderCuestionarioItem('Cuestionario Inicial', estado.pre, 'cuestionario-pre', insc.asignaturaId, !estado.pre)}
                ${renderCuestionarioItem('Encuesta Reto 1', estado.reto1, 'encuesta-reto', insc.asignaturaId, estado.pre && !estado.reto1, 1)}
                ${renderCuestionarioItem('Encuesta Reto 2', estado.reto2, 'encuesta-reto', insc.asignaturaId, estado.reto1 && !estado.reto2, 2)}
                ${renderCuestionarioItem('Cuestionario Final', estado.post, 'cuestionario-post', insc.asignaturaId, estado.reto2 && !estado.post)}
            </div>
        </div>
    `;
}

// Renderizar ítem de cuestionario
function renderCuestionarioItem(nombre, completado, tipo, asignaturaId, disponible, numeroReto = null) {
    const icono = completado ? '✅' : (disponible ? '📝' : '🔒');
    const estado = completado ? 'Completado' : (disponible ? 'Disponible' : 'Bloqueado');
    const estadoClass = completado ? 'color: var(--verde-primario)' : (disponible ? 'color: var(--azul-primario)' : 'color: var(--gris-medio)');

    let onclick = '';
    if (disponible && !completado) {
        const params = numeroReto ? `'${tipo}', '${asignaturaId}', ${numeroReto}` : `'${tipo}', '${asignaturaId}'`;
        onclick = `onclick="abrirCuestionario(${params})"`;
    }

    return `
        <div class="card" style="margin: 0; ${disponible && !completado ? 'cursor: pointer;' : ''}" ${onclick}>
            <div style="font-size: 2rem; margin-bottom: 10px;">${icono}</div>
            <h3 style="font-size: 1rem;">${nombre}</h3>
            <p style="${estadoClass}; font-size: 0.85rem;">${estado}</p>
        </div>
    `;
}

// Abrir cuestionario
function abrirCuestionario(tipo, asignaturaId, numeroReto = null) {
    // Guardar en sessionStorage para recuperar en el formulario
    sessionStorage.setItem('currentAsignaturaId', asignaturaId);
    if (numeroReto) {
        sessionStorage.setItem('currentNumeroReto', numeroReto);
    }

    // Encontrar el código anónimo
    const insc = inscripciones.find(i => i.asignaturaId === asignaturaId);
    if (insc) {
        sessionStorage.setItem('currentCodigoAnonimo', insc.estudiante.codigoAnonimo);
    }

    // Mostrar el formulario correspondiente
    document.getElementById('panel-principal').style.display = 'none';
    document.getElementById('panel-formulario').style.display = 'block';

    cargarFormulario(tipo, asignaturaId, numeroReto);
}

// Volver al panel principal
function volverAlPanel() {
    document.getElementById('panel-formulario').style.display = 'none';
    document.getElementById('panel-principal').style.display = 'block';
    cargarInscripciones(); // Recargar para actualizar estado
}

// Cargar formulario específico
function cargarFormulario(tipo, asignaturaId, numeroReto) {
    const container = document.getElementById('formulario-container');

    switch (tipo) {
        case 'cuestionario-pre':
            container.innerHTML = getFormularioPre();
            break;
        case 'encuesta-reto':
            container.innerHTML = getFormularioReto(numeroReto);
            break;
        case 'cuestionario-post':
            container.innerHTML = getFormularioPost();
            break;
    }
}

function estaRespondido(valor) {
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === 'boolean') return valor;
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
}

function calcularResumenRespuestas(tipo, formData) {
    const checks = [];

    if (tipo === 'pre') {
        checks.push(estaRespondido(formData.frecuencia_uso));
        checks.push(formData.frecuencia_uso === 'nunca' || estaRespondido(formData.herramientas));
        checks.push(estaRespondido(formData.actitud_util));
        checks.push(estaRespondido(formData.actitud_dependencia));
        checks.push(estaRespondido(formData.actitud_trampa));
        checks.push(estaRespondido(formData.actitud_verificar));
        checks.push(estaRespondido(formData.expectativa_resultado));
    } else if (tipo === 'reto') {
        checks.push(estaRespondido(formData.condicion));
        checks.push(estaRespondido(formData.tiempo));
        checks.push(estaRespondido(formData.dificultad));
        checks.push(estaRespondido(formData.satisfaccion));
        checks.push(estaRespondido(formData.aprendizaje));
        checks.push(estaRespondido(formData.motivacion));

        if (formData.condicion === 'con_ia') {
            checks.push(estaRespondido(formData.consultas_ia));
            checks.push(estaRespondido(formData.revision_ia));
        }
    } else if (tipo === 'post') {
        checks.push(estaRespondido(formData.mejor_resultado));
        checks.push(estaRespondido(formData.mas_aprendizaje));
        checks.push(estaRespondido(formData.preferencia));
        checks.push(estaRespondido(formData.reflexion_personal));
        checks.push(estaRespondido(formData.consejo));
        checks.push(estaRespondido(formData.utilidad));
    }

    const total = checks.length;
    const respondidas = checks.filter(Boolean).length;

    return {
        total,
        respondidas,
        vacias: total - respondidas
    };
}

// Guardar respuestas
async function guardarRespuestas(tipo, formData) {
    const asignaturaId = sessionStorage.getItem('currentAsignaturaId');
    const codigoAnonimo = sessionStorage.getItem('currentCodigoAnonimo');
    const numeroReto = sessionStorage.getItem('currentNumeroReto');

    const datos = {
        codigoAnonimo,
        asignaturaId,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        respuestas: formData
    };

    if (numeroReto) {
        datos.numeroReto = parseInt(numeroReto);
        datos.condicion = formData.condicion;
    }

    try {
        // Verificar si ya fue completado (protección contra duplicados)
        const estudianteDoc = await db.collection('asignaturas')
            .doc(asignaturaId)
            .collection('estudiantes')
            .doc(currentUser.email)
            .get();

        const estData = estudianteDoc.data();
        const campoCompletado = tipo === 'pre' ? 'completado_pre' :
                                 tipo === 'post' ? 'completado_post' :
                                 'completado_reto' + (datos.numeroReto || sessionStorage.getItem('currentNumeroReto'));

        if (estData[campoCompletado]) {
            mostrarMensaje('Este cuestionario ya ha sido completado', 'warning');
            setTimeout(volverAlPanel, 1500);
            return;
        }

        let collection;
        switch (tipo) {
            case 'pre':
                collection = 'respuestas_pre';
                break;
            case 'reto':
                collection = 'respuestas_reto';
                break;
            case 'post':
                collection = 'respuestas_post';
                break;
        }

        await db.collection(collection).add(datos);

        // Actualizar estado de completado en el documento de inscripción
        const resumen = calcularResumenRespuestas(tipo, formData);
        const sufijo = tipo === 'reto'
            ? 'reto' + (datos.numeroReto || sessionStorage.getItem('currentNumeroReto'))
            : tipo;
        const actualizacionEstado = {
            [campoCompletado]: true,
            [`audit_${sufijo}_total`]: resumen.total,
            [`audit_${sufijo}_respondidas`]: resumen.respondidas,
            [`audit_${sufijo}_vacias`]: resumen.vacias,
            [`audit_${sufijo}_fecha`]: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('asignaturas')
            .doc(asignaturaId)
            .collection('estudiantes')
            .doc(currentUser.email)
            .update(actualizacionEstado);

        mostrarMensaje('Respuestas guardadas correctamente', 'success');

        // Limpiar sessionStorage
        sessionStorage.removeItem('currentNumeroReto');

        setTimeout(volverAlPanel, 1500);

    } catch (error) {
        console.error('Error guardando:', error);
        mostrarMensaje('Error al guardar: ' + error.message, 'error');
    }
}

// Los formularios HTML se generan dinámicamente
function getFormularioPre() {
    return `
        <div class="form-card">
            <h2>Cuestionario Inicial</h2>
            <div class="alert alert-info">
                Este cuestionario nos ayuda a conocer tu experiencia previa con IA.
                Es completamente anónimo y no afecta a tu calificación.
            </div>

            <form id="form-pre" onsubmit="submitFormPre(event)">
                <!-- Experiencia con IA -->
                <h3 style="margin-top: 25px;">Experiencia con IA Generativa</h3>

                <div class="form-group">
                    <label class="required">¿Has utilizado herramientas de IA generativa?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="frecuencia_uso" value="nunca" required> Nunca</label>
                        <label class="option-item"><input type="radio" name="frecuencia_uso" value="pocas_veces"> Una o dos veces</label>
                        <label class="option-item"><input type="radio" name="frecuencia_uso" value="ocasional"> Ocasionalmente</label>
                        <label class="option-item"><input type="radio" name="frecuencia_uso" value="regular"> Regularmente</label>
                        <label class="option-item"><input type="radio" name="frecuencia_uso" value="diario"> Diariamente</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>¿Qué herramientas has usado?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="checkbox" name="herramientas" value="chatgpt"> ChatGPT</label>
                        <label class="option-item"><input type="checkbox" name="herramientas" value="claude"> Claude</label>
                        <label class="option-item"><input type="checkbox" name="herramientas" value="gemini"> Gemini</label>
                        <label class="option-item"><input type="checkbox" name="herramientas" value="copilot"> Copilot</label>
                        <label class="option-item"><input type="checkbox" name="herramientas" value="perplexity"> Perplexity</label>
                        <label class="option-item"><input type="checkbox" name="herramientas" value="ninguna"> Ninguna</label>
                    </div>
                </div>

                <!-- Actitudes -->
                <h3 style="margin-top: 25px;">Actitudes hacia la IA en Educación</h3>
                <p style="color: var(--gris-oscuro); margin-bottom: 15px;"><em>Indica tu grado de acuerdo (1=Muy en desacuerdo, 5=Muy de acuerdo)</em></p>

                <table class="likert-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>La IA puede ser útil para el aprendizaje</td>
                            <td><input type="radio" name="actitud_util" value="1" required></td>
                            <td><input type="radio" name="actitud_util" value="2"></td>
                            <td><input type="radio" name="actitud_util" value="3"></td>
                            <td><input type="radio" name="actitud_util" value="4"></td>
                            <td><input type="radio" name="actitud_util" value="5"></td>
                        </tr>
                        <tr>
                            <td>Me preocupa depender demasiado de la IA</td>
                            <td><input type="radio" name="actitud_dependencia" value="1" required></td>
                            <td><input type="radio" name="actitud_dependencia" value="2"></td>
                            <td><input type="radio" name="actitud_dependencia" value="3"></td>
                            <td><input type="radio" name="actitud_dependencia" value="4"></td>
                            <td><input type="radio" name="actitud_dependencia" value="5"></td>
                        </tr>
                        <tr>
                            <td>Usar IA en tareas académicas es hacer trampa</td>
                            <td><input type="radio" name="actitud_trampa" value="1" required></td>
                            <td><input type="radio" name="actitud_trampa" value="2"></td>
                            <td><input type="radio" name="actitud_trampa" value="3"></td>
                            <td><input type="radio" name="actitud_trampa" value="4"></td>
                            <td><input type="radio" name="actitud_trampa" value="5"></td>
                        </tr>
                        <tr>
                            <td>Es importante verificar lo que dice la IA</td>
                            <td><input type="radio" name="actitud_verificar" value="1" required></td>
                            <td><input type="radio" name="actitud_verificar" value="2"></td>
                            <td><input type="radio" name="actitud_verificar" value="3"></td>
                            <td><input type="radio" name="actitud_verificar" value="4"></td>
                            <td><input type="radio" name="actitud_verificar" value="5"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- Expectativas -->
                <h3 style="margin-top: 25px;">Expectativas</h3>

                <div class="form-group">
                    <label>¿Crees que obtendrás mejor resultado con IA o sin IA?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="expectativa_resultado" value="con_ia"> Mejor con IA</label>
                        <label class="option-item"><input type="radio" name="expectativa_resultado" value="sin_ia"> Mejor sin IA</label>
                        <label class="option-item"><input type="radio" name="expectativa_resultado" value="igual"> Similar en ambos</label>
                    </div>
                </div>

                <!-- Consentimiento -->
                <div style="background: #F0FFF4; border: 2px solid var(--verde-primario); border-radius: var(--radio-borde); padding: 20px; margin: 25px 0;">
                    <label style="display: flex; align-items: flex-start; gap: 15px; cursor: pointer;">
                        <input type="checkbox" name="consentimiento" required style="width: 24px; height: 24px; margin-top: 3px;">
                        <span><strong>Acepto participar en este estudio.</strong> Entiendo que mi participación es voluntaria, mis datos son anónimos y puedo retirarme en cualquier momento.</span>
                    </label>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="volverAlPanel()" class="btn btn-outline">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Enviar cuestionario</button>
                </div>
            </form>
        </div>
    `;
}

function submitFormPre(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        frecuencia_uso: form.frecuencia_uso.value,
        herramientas: Array.from(form.querySelectorAll('input[name="herramientas"]:checked')).map(cb => cb.value),
        actitud_util: form.actitud_util.value,
        actitud_dependencia: form.actitud_dependencia.value,
        actitud_trampa: form.actitud_trampa.value,
        actitud_verificar: form.actitud_verificar.value,
        expectativa_resultado: form.expectativa_resultado?.value || '',
        consentimiento: form.consentimiento.checked
    };
    guardarRespuestas('pre', formData);
}

function getFormularioReto(numeroReto) {
    // Determinar condición automática según grupo asignado
    const asignaturaId = sessionStorage.getItem('currentAsignaturaId');
    const insc = inscripciones.find(i => i.asignaturaId === asignaturaId);
    const grupo = insc && insc.estudiante && insc.estudiante.grupo;
    let condicionAuto = null;
    if (grupo) {
        condicionAuto = grupo === 'A'
            ? (numeroReto === 1 ? 'sin_ia' : 'con_ia')
            : (numeroReto === 1 ? 'con_ia' : 'sin_ia');
    }

    return `
        <div class="form-card">
            <h2>Encuesta Post-Reto ${numeroReto}</h2>
            <div class="alert alert-info">
                Cuéntanos tu experiencia con el reto que acabas de completar.
            </div>

            <form id="form-reto" onsubmit="submitFormReto(event)">
                <div class="form-group">
                    <label class="required">¿Cómo realizaste este reto?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="condicion" value="sin_ia" required id="cond-sin" ${condicionAuto === 'sin_ia' ? 'checked' : ''} ${condicionAuto ? 'onclick="return false;"' : ''}> SIN usar IA</label>
                        <label class="option-item"><input type="radio" name="condicion" value="con_ia" id="cond-con" ${condicionAuto === 'con_ia' ? 'checked' : ''} ${condicionAuto ? 'onclick="return false;"' : ''}> CON uso de IA</label>
                    </div>
                    ${condicionAuto ? '<div class="alert alert-info" style="margin-top: 10px;">Tu grupo (' + grupo + ') tiene asignada la condición <strong>' + (condicionAuto === 'con_ia' ? 'CON IA' : 'SIN IA') + '</strong> para este reto.</div>' : ''}
                </div>

                <div class="form-group">
                    <label class="required">Tiempo dedicado aproximadamente</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="tiempo" value="menos_30" required> Menos de 30 min</label>
                        <label class="option-item"><input type="radio" name="tiempo" value="30_60"> 30-60 min</label>
                        <label class="option-item"><input type="radio" name="tiempo" value="1_2h"> 1-2 horas</label>
                        <label class="option-item"><input type="radio" name="tiempo" value="2_3h"> 2-3 horas</label>
                        <label class="option-item"><input type="radio" name="tiempo" value="mas_3h"> Más de 3 horas</label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="required">Dificultad del reto (1=Muy fácil, 10=Muy difícil)</label>
                    <div class="numeric-scale">
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                            <label>
                                <input type="radio" name="dificultad" value="${n}" ${n===1?'required':''}>
                                <span>${n}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <h3 style="margin-top: 25px;">Satisfacción y aprendizaje</h3>
                <p style="color: var(--gris-oscuro); margin-bottom: 15px;"><em>Indica tu grado de acuerdo (1=Muy en desacuerdo, 5=Muy de acuerdo)</em></p>

                <table class="likert-table">
                    <thead>
                        <tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Estoy satisfecho/a con mi trabajo</td>
                            <td><input type="radio" name="satisfaccion" value="1" required></td>
                            <td><input type="radio" name="satisfaccion" value="2"></td>
                            <td><input type="radio" name="satisfaccion" value="3"></td>
                            <td><input type="radio" name="satisfaccion" value="4"></td>
                            <td><input type="radio" name="satisfaccion" value="5"></td>
                        </tr>
                        <tr>
                            <td>He aprendido cosas nuevas</td>
                            <td><input type="radio" name="aprendizaje" value="1" required></td>
                            <td><input type="radio" name="aprendizaje" value="2"></td>
                            <td><input type="radio" name="aprendizaje" value="3"></td>
                            <td><input type="radio" name="aprendizaje" value="4"></td>
                            <td><input type="radio" name="aprendizaje" value="5"></td>
                        </tr>
                        <tr>
                            <td>Me he sentido motivado/a</td>
                            <td><input type="radio" name="motivacion" value="1" required></td>
                            <td><input type="radio" name="motivacion" value="2"></td>
                            <td><input type="radio" name="motivacion" value="3"></td>
                            <td><input type="radio" name="motivacion" value="4"></td>
                            <td><input type="radio" name="motivacion" value="5"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- Sección específica CON IA (se muestra/oculta) -->
                <div id="seccion-con-ia" class="conditional-section">
                    <h3>Uso de la IA</h3>
                    <div class="form-group">
                        <label>¿Cuántas veces consultaste la IA?</label>
                        <div class="options-group">
                            <label class="option-item"><input type="radio" name="consultas_ia" value="1_2"> 1-2</label>
                            <label class="option-item"><input type="radio" name="consultas_ia" value="3_5"> 3-5</label>
                            <label class="option-item"><input type="radio" name="consultas_ia" value="6_10"> 6-10</label>
                            <label class="option-item"><input type="radio" name="consultas_ia" value="mas_10"> Más de 10</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>¿Revisaste las respuestas de la IA?</label>
                        <div class="options-group">
                            <label class="option-item"><input type="radio" name="revision_ia" value="siempre"> Siempre las revisé y modifiqué</label>
                            <label class="option-item"><input type="radio" name="revision_ia" value="algunos_cambios"> Las revisé e hice algunos cambios</label>
                            <label class="option-item"><input type="radio" name="revision_ia" value="apenas"> Las revisé pero apenas cambié</label>
                            <label class="option-item"><input type="radio" name="revision_ia" value="no"> No las revisé</label>
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 25px;">
                    <label>Comentarios adicionales (opcional)</label>
                    <textarea name="comentarios" class="form-control" placeholder="¿Algo que quieras añadir sobre tu experiencia?"></textarea>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="volverAlPanel()" class="btn btn-outline">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Enviar encuesta</button>
                </div>
            </form>
        </div>
    `;
}

// Mostrar/ocultar sección de IA según condición
document.addEventListener('change', function(e) {
    if (e.target.name === 'condicion') {
        const seccionIA = document.getElementById('seccion-con-ia');
        if (seccionIA) {
            if (e.target.value === 'con_ia') {
                seccionIA.classList.add('active');
            } else {
                seccionIA.classList.remove('active');
            }
        }
    }
});

function submitFormReto(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        condicion: form.condicion.value,
        tiempo: form.tiempo.value,
        dificultad: form.dificultad.value,
        satisfaccion: form.satisfaccion.value,
        aprendizaje: form.aprendizaje.value,
        motivacion: form.motivacion.value,
        consultas_ia: form.consultas_ia?.value || '',
        revision_ia: form.revision_ia?.value || '',
        comentarios: form.comentarios.value
    };
    guardarRespuestas('reto', formData);
}

function getFormularioPost() {
    return `
        <div class="form-card">
            <h2>Cuestionario Final</h2>
            <div class="alert alert-info">
                Has completado ambos retos. Cuéntanos tu reflexión global sobre la experiencia.
            </div>

            <form id="form-post" onsubmit="submitFormPost(event)">
                <h3>Comparación entre retos</h3>

                <div class="form-group">
                    <label>¿En cuál obtuviste mejor resultado?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="mejor_resultado" value="sin_ia"> En el reto SIN IA</label>
                        <label class="option-item"><input type="radio" name="mejor_resultado" value="con_ia"> En el reto CON IA</label>
                        <label class="option-item"><input type="radio" name="mejor_resultado" value="igual"> Similar en ambos</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>¿En cuál aprendiste más?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="mas_aprendizaje" value="sin_ia"> En el reto SIN IA</label>
                        <label class="option-item"><input type="radio" name="mas_aprendizaje" value="con_ia"> En el reto CON IA</label>
                        <label class="option-item"><input type="radio" name="mas_aprendizaje" value="igual"> En ambos por igual</label>
                    </div>
                </div>

                <h3 style="margin-top: 25px;">Preferencias para el futuro</h3>

                <div class="form-group">
                    <label>Para aprender un tema nuevo, ¿qué preferirías?</label>
                    <div class="options-group" style="flex-direction: column;">
                        <label class="option-item"><input type="radio" name="preferencia" value="sin_luego_con"> Primero sin IA, luego con IA</label>
                        <label class="option-item"><input type="radio" name="preferencia" value="con_luego_sin"> Primero con IA, luego sin IA</label>
                        <label class="option-item"><input type="radio" name="preferencia" value="siempre_con"> Siempre con IA</label>
                        <label class="option-item"><input type="radio" name="preferencia" value="siempre_sin"> Siempre sin IA</label>
                        <label class="option-item"><input type="radio" name="preferencia" value="depende"> Depende de la tarea</label>
                    </div>
                </div>

                <h3 style="margin-top: 25px;">Reflexión</h3>

                <div class="form-group">
                    <label>¿Qué aprendiste sobre ti mismo/a como estudiante?</label>
                    <textarea name="reflexion_personal" class="form-control" placeholder="Escribe tu reflexión..."></textarea>
                </div>

                <div class="form-group">
                    <label>¿Qué consejo darías a otros estudiantes sobre el uso de IA para aprender?</label>
                    <textarea name="consejo" class="form-control" placeholder="Tu consejo..."></textarea>
                </div>

                <h3 style="margin-top: 25px;">Valoración del experimento</h3>

                <div class="form-group">
                    <label>¿Te ha parecido útil participar?</label>
                    <div class="options-group">
                        <label class="option-item"><input type="radio" name="utilidad" value="muy_util"> Muy útil</label>
                        <label class="option-item"><input type="radio" name="utilidad" value="util"> Útil</label>
                        <label class="option-item"><input type="radio" name="utilidad" value="algo"> Algo útil</label>
                        <label class="option-item"><input type="radio" name="utilidad" value="poco"> Poco útil</label>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="volverAlPanel()" class="btn btn-outline">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Enviar cuestionario final</button>
                </div>
            </form>
        </div>
    `;
}

function submitFormPost(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        mejor_resultado: form.mejor_resultado?.value || '',
        mas_aprendizaje: form.mas_aprendizaje?.value || '',
        preferencia: form.preferencia?.value || '',
        reflexion_personal: form.reflexion_personal.value,
        consejo: form.consejo.value,
        utilidad: form.utilidad?.value || ''
    };
    guardarRespuestas('post', formData);
}

// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', initEstudiantePanel);
