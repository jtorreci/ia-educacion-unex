/**
 * Script de backup de Firestore
 * Exporta todas las colecciones (incluidas subcolecciones) a un archivo JSON con timestamp.
 *
 * Uso: node backup-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Buscar automáticamente el archivo de service account en el directorio actual
const saFiles = fs.readdirSync(__dirname).filter(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
if (saFiles.length === 0) {
    console.error('ERROR: No se encontró archivo de service account (firebase-adminsdk*.json) en el directorio.');
    process.exit(1);
}

const serviceAccount = require(path.join(__dirname, saFiles[0]));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Colecciones principales a exportar
const COLECCIONES = [
    'usuarios',
    'asignaturas',
    'centros',
    'respuestas_pre',
    'respuestas_reto',
    'respuestas_post',
    'rubricas',
    'config'
];

// Subcolecciones conocidas
const SUBCOLECCIONES = {
    'asignaturas': ['estudiantes']
};

async function exportarColeccion(nombre) {
    console.log(`  Exportando ${nombre}...`);
    const snapshot = await db.collection(nombre).get();
    const docs = [];

    for (const doc of snapshot.docs) {
        const entry = {
            _id: doc.id,
            ...doc.data()
        };

        // Exportar subcolecciones si las tiene
        if (SUBCOLECCIONES[nombre]) {
            for (const subNombre of SUBCOLECCIONES[nombre]) {
                const subSnap = await doc.ref.collection(subNombre).get();
                if (!subSnap.empty) {
                    entry[`_sub_${subNombre}`] = subSnap.docs.map(subDoc => ({
                        _id: subDoc.id,
                        ...subDoc.data()
                    }));
                }
            }
        }

        docs.push(entry);
    }

    console.log(`    -> ${docs.length} documentos`);
    return docs;
}

async function main() {
    console.log('=== BACKUP DE FIRESTORE ===');
    console.log(`Fecha: ${new Date().toISOString()}\n`);

    const backup = {
        _metadata: {
            fecha: new Date().toISOString(),
            proyecto: serviceAccount.project_id,
            colecciones: COLECCIONES
        }
    };

    for (const col of COLECCIONES) {
        try {
            backup[col] = await exportarColeccion(col);
        } catch (error) {
            console.error(`  ERROR en ${col}: ${error.message}`);
            backup[col] = { _error: error.message };
        }
    }

    // Generar nombre con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `backup-firestore-${timestamp}.json`;
    const filePath = path.join(__dirname, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`\nBackup guardado en: ${fileName}`);
    console.log('=== BACKUP COMPLETADO ===');

    process.exit(0);
}

main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
