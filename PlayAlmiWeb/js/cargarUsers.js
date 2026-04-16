const API_CANDIDATAS = [
    'http://192.168.0.84:8080/api/users',
];

const estado = document.getElementById('estado');
const contenido = document.getElementById('contenido');
const tablaBody = document.getElementById('tabla-body');
const totalUsuarios = document.getElementById('total-usuarios');
const statusText = document.getElementById('status-text');
const btnRecargar = document.getElementById('btn-recargar');

function escapeHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatearFechaSoloYMD(fecha) {
    const texto = String(fecha ?? '').trim();
    if (!texto) return 'Sin fecha';

    const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const date = new Date(texto);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toISOString().slice(0, 10);
}

function renderTabla(usuarios) {
    const ranking = [...usuarios].sort((a, b) => {
        const puntosA = Number(a?.puntos ?? 0);
        const puntosB = Number(b?.puntos ?? 0);
        if (puntosB !== puntosA) return puntosB - puntosA;

        const killsA = Number(a?.kills ?? 0);
        const killsB = Number(b?.kills ?? 0);
        return killsB - killsA;
    });

    if (!usuarios.length) {
        tablaBody.innerHTML = '<tr><td colspan="5" class="empty">No hay usuarios para mostrar.</td></tr>';
        return;
    }

    tablaBody.innerHTML = ranking
        .map((usuario, index) => {
            const username = escapeHtml(usuario.username || 'Sin nombre');
            const kills = escapeHtml(usuario.kills ?? 0);
            const puntos = escapeHtml(usuario.puntos ?? 0);
            const fecha = escapeHtml(formatearFechaSoloYMD(usuario.fecha_lanzamiento));

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${username}</td>
                    <td>${kills}</td>
                    <td>${puntos}</td>
                    <td>${fecha}</td>
                </tr>
            `;
        })
        .join('');
}

async function cargarUsuarios() {
    estado.style.display = 'block';
    estado.innerHTML = '<p>Cargando datos del bunker...</p>';
    contenido.style.display = 'none';

    try {
        let response = null;
        let apiActiva = '';
        let ultimoError = null;

        for (const url of API_CANDIDATAS) {
            try {
                const intento = await fetch(url, { method: 'GET' });
                if (!intento.ok) {
                    throw new Error(`Error HTTP ${intento.status}`);
                }

                response = intento;
                apiActiva = url;
                break;
            } catch (err) {
                ultimoError = err;
            }
        }

        if (!response) {
            throw ultimoError || new Error('No se pudo conectar con ninguna URL de API');
        }

        const payload = await response.json();
        const usuarios = Array.isArray(payload?.data) ? payload.data : [];

        renderTabla(usuarios);
        totalUsuarios.textContent = String(usuarios.length);
        statusText.textContent = `API conectada (${apiActiva})`;
        estado.style.display = 'none';
        contenido.style.display = 'block';
    } catch (error) {
        statusText.textContent = 'API sin conexion';
        estado.innerHTML = `<p style="color:#ff8b8b;">Error al cargar usuarios: ${escapeHtml(error.message)}. Revisa CORS/puerto 8080 o que la API este encendida.</p>`;
        contenido.style.display = 'none';
        console.error('Error al cargar usuarios:', error);
    }
}

cargarUsuarios();

if (btnRecargar) {
    btnRecargar.addEventListener('click', cargarUsuarios);
}