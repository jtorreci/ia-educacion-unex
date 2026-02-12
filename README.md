# IA y Educación UEx

**Proyecto de Innovación Docente - Universidad de Extremadura**

Plataforma web para investigar el impacto de la Inteligencia Artificial en el aprendizaje universitario mediante un diseño experimental cruzado (crossover).

## Sobre el Proyecto

Este proyecto de innovación docente investiga cómo el uso de herramientas de IA generativa afecta al aprendizaje y rendimiento de los estudiantes universitarios. Utilizamos un **diseño crossover** donde cada estudiante actúa como su propio control:

- **Reto 1**: Grupo A sin IA / Grupo B con IA
- **Reto 2**: Grupo A con IA / Grupo B sin IA

### Objetivos

1. Evaluar el impacto de la IA en la calidad del aprendizaje
2. Analizar la percepción estudiantil sobre el uso de IA
3. Identificar mejores prácticas para integrar IA en la docencia
4. Medir el desarrollo de pensamiento crítico con y sin IA

### Titulaciones participantes

- Ingeniería Civil
- Grado en Edificación
- Máster en Ingeniería de Caminos, Canales y Puertos
- Máster BIM

## Tecnología

- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **CI/CD**: GitHub Actions
- **Autenticación**: Magic Link (enlace por email, sin contraseñas)

## Estructura del Proyecto

```
├── .github/workflows/          # CI/CD con GitHub Actions
├── public/
│   ├── index.html              # Landing page
│   ├── proyecto.html           # Descripción del proyecto
│   ├── recursos.html           # Recursos descargables
│   ├── participar.html         # Info para participar
│   ├── app/                    # Aplicación web
│   │   ├── login.html          # Acceso con magic link
│   │   ├── estudiante.html     # Panel estudiante
│   │   ├── profesor.html       # Panel profesor
│   │   └── admin.html          # Panel administración
│   ├── js/                     # Lógica de la aplicación
│   ├── css/                    # Estilos
│   └── docs/                   # PDFs descargables
├── firebase.json               # Configuración Firebase Hosting
├── firestore.rules             # Reglas de seguridad
└── README.md
```

## Roles de Usuario

| Rol | Funciones |
|-----|-----------|
| **Estudiante** | Completar cuestionarios PRE/POST, encuestas de cada reto |
| **Profesor** | Gestionar asignaturas, añadir estudiantes, evaluar con rúbrica |
| **Admin** | Ver estadísticas, gestionar profesores, exportar datos |

## Privacidad y Anonimización

- Los datos de investigación se almacenan con **códigos anónimos** (SHA-256)
- Los profesores **NO pueden ver** las respuestas de las encuestas
- Solo los administradores pueden exportar datos para análisis
- Cumplimiento con normativa de protección de datos

## Desarrollo Local

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login en Firebase
firebase login

# Iniciar emuladores locales
firebase emulators:start

# Desplegar a producción
firebase deploy
```

## CI/CD

El proyecto usa GitHub Actions para despliegue automático:

- **Push a main**: Despliega a producción
- **Pull Request**: Crea preview temporal

Ver sección de configuración más abajo para activar el workflow.

---

## Documentación Técnica

### Modelo de Datos (Firestore)

#### Colección `usuarios`
```javascript
{
  email: "usuario@unex.es",
  nombre: "Nombre Completo",
  rol: "admin" | "profesor" | "estudiante",
  fechaRegistro: Timestamp
}
```

#### Colección `asignaturas`
```javascript
{
  nombre: "Nombre de la asignatura",
  titulacion: "Ingeniería Civil",
  curso: "2025-2026",
  profesorEmail: "profesor@unex.es",
  esSimulacro: false,
  fechaCreacion: Timestamp
}
```

#### Subcolección `asignaturas/{id}/estudiantes`
```javascript
{
  nombre: "nombre.estudiante",
  codigoAnonimo: "a1b2c3d4e5f6g7h8",
  fechaInscripcion: Timestamp
}
```

#### Colecciones de respuestas
- `respuestas_pre` - Cuestionario inicial
- `respuestas_reto` - Encuesta post-reto (con campo `usoIA`)
- `respuestas_post` - Cuestionario final
- `rubricas` - Evaluaciones de profesores

### Anonimización

```
codigoAnonimo = SHA256(SALT + email + "_" + asignaturaId).substring(0, 16)
```

Permite vincular respuestas del mismo estudiante sin revelar su identidad.

### Reglas de Seguridad

- Solo usuarios autenticados pueden acceder
- Profesores NO pueden leer respuestas de encuestas
- Estudiantes solo pueden crear (no leer/modificar) sus respuestas
- Solo admins pueden exportar datos

---

## Configuración del CI/CD

### Paso 1: Generar Token de Firebase

```bash
firebase login:ci
```

Copia el token que aparece.

### Paso 2: Generar Service Account

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Proyecto > Configuración > Cuentas de servicio
3. "Generar nueva clave privada"
4. Descarga el archivo JSON

### Paso 3: Configurar Secrets en GitHub

Ve a: `Settings > Secrets and variables > Actions`

Añade estos secrets:

| Secret | Valor |
|--------|-------|
| `FIREBASE_TOKEN` | Token del paso 1 |
| `FIREBASE_SERVICE_ACCOUNT` | Contenido completo del JSON del paso 2 |

### URLs de Producción

- **Web**: https://gestor-investigacion-app.web.app
- **Firestore**: https://console.firebase.google.com/project/gestor-investigacion-app

---

## Licencia

Proyecto de Innovación Docente - Universidad de Extremadura
Curso 2025-2026

## Contacto

Para participar o más información, contacta con el equipo del proyecto a través de la [página de participación](https://gestor-investigacion-app.web.app/participar.html).
