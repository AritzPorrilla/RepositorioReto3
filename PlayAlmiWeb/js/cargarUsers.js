const API_CANDIDATAS = [
    'http://192.168.0.84:8080/api/users',
];

const estado = document.getElementById('estado');
const contenido = document.getElementById('contenido');
const tablaBody = document.getElementById('tabla-body');
const totalUsuarios = document.getElementById('total-usuarios');
const statusText = document.getElementById('status-text');
const btnRecargar = document.getElementById('btn-recargar');
const btnVerMas = document.getElementById('btn-ver-mas');
const btnLogout = document.getElementById('btn-logout');
const resumenRanking = document.getElementById('resumen-ranking');
const sesionActiva = document.getElementById('sesion-activa');
const busquedaNombre = document.getElementById('busqueda-nombre');
const ordenRanking = document.getElementById('orden-ranking');

const PLAYALMI_SESSION_KEY = 'playalmi_active_user';

const LIMITE_TOP = 10;

let rankingActual = [];
let mostrarTodos = false;
let usuariosCargados = [];
const usuarioActivo = getActiveUser();

function getActiveUser() {
    try {
        const raw = localStorage.getItem(PLAYALMI_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearActiveUser() {
    localStorage.removeItem(PLAYALMI_SESSION_KEY);
}

function enviarARegistro() {
    window.location.href = './registro.html';
}

if (!usuarioActivo?.username) {
    enviarARegistro();
}

if (sesionActiva && usuarioActivo?.username) {
    sesionActiva.textContent = `Sesion activa: ${usuarioActivo.username}`;
}

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

function getFechaTimestamp(usuario) {
    const raw = String(usuario?.fecha_lanzamiento ?? '').trim();
    if (!raw) return Number.POSITIVE_INFINITY;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
    return date.getTime();
}

function filtrarYOrdenarUsuarios(usuarios) {
    const filtro = String(busquedaNombre?.value || '').trim().toLowerCase();
    const criterio = String(ordenRanking?.value || 'puntos');

    const filtrados = usuarios.filter((usuario) => {
        if (!filtro) return true;
        const username = String(usuario?.username || '').toLowerCase();
        return username.includes(filtro);
    });

    return filtrados.sort((a, b) => {
        if (criterio === 'kills') {
            const killsA = Number(a?.kills ?? 0);
            const killsB = Number(b?.kills ?? 0);
            if (killsB !== killsA) return killsB - killsA;

            const puntosA = Number(a?.puntos ?? 0);
            const puntosB = Number(b?.puntos ?? 0);
            return puntosB - puntosA;
        }

        if (criterio === 'antiguedad') {
            const fechaA = getFechaTimestamp(a);
            const fechaB = getFechaTimestamp(b);
            if (fechaA !== fechaB) return fechaA - fechaB;

            const puntosA = Number(a?.puntos ?? 0);
            const puntosB = Number(b?.puntos ?? 0);
            return puntosB - puntosA;
        }

        if (criterio === 'menos-antiguo') {
            const fechaA = getFechaTimestamp(a);
            const fechaB = getFechaTimestamp(b);
            if (fechaA !== fechaB) return fechaB - fechaA;

            const puntosA = Number(a?.puntos ?? 0);
            const puntosB = Number(b?.puntos ?? 0);
            return puntosB - puntosA;
        }

        const puntosA = Number(a?.puntos ?? 0);
        const puntosB = Number(b?.puntos ?? 0);
        if (puntosB !== puntosA) return puntosB - puntosA;

        const killsA = Number(a?.kills ?? 0);
        const killsB = Number(b?.kills ?? 0);
        return killsB - killsA;
    });
}

function renderTabla(usuarios) {
    const ranking = filtrarYOrdenarUsuarios([...usuarios]);
    const criterio = String(ordenRanking?.value || 'puntos');
    const filtro = String(busquedaNombre?.value || '').trim();
    const etiquetaOrden = criterio === 'kills'
        ? 'kills'
        : criterio === 'menos-antiguo'
            ? 'menos antiguedad'
        : criterio === 'antiguedad'
            ? 'antiguedad'
            : 'puntos';

    rankingActual = ranking;

    if (!ranking.length) {
        tablaBody.innerHTML = '<tr><td colspan="5" class="empty">No hay jugadores que coincidan con la busqueda.</td></tr>';
        if (btnVerMas) btnVerMas.style.display = 'none';
        if (resumenRanking) {
            resumenRanking.textContent = filtro
                ? `No hay resultados para "${filtro}".`
                : 'No hay jugadores registrados aun.';
        }
        return;
    }

    const rankingVisible = mostrarTodos ? ranking : ranking.slice(0, LIMITE_TOP);
    tablaBody.innerHTML = rankingVisible
        .map((usuario, index) => {
            const posicion = mostrarTodos ? index + 1 : index + 1;
            const username = escapeHtml(usuario.username || 'Sin nombre');
            const kills = escapeHtml(usuario.kills ?? 0);
            const puntos = escapeHtml(usuario.puntos ?? 0);
            const fecha = escapeHtml(formatearFechaSoloYMD(usuario.fecha_lanzamiento));

            return `
                <tr>
                    <td>${posicion}</td>
                    <td>${username}</td>
                    <td>${kills}</td>
                    <td>${puntos}</td>
                    <td>${fecha}</td>
                </tr>
            `;
        })
        .join('');

    if (resumenRanking) {
        resumenRanking.textContent = mostrarTodos
            ? `Mostrando ${ranking.length} jugadores ordenados por ${etiquetaOrden}.`
            : `Mostrando Top ${Math.min(LIMITE_TOP, ranking.length)} por ${etiquetaOrden}.`;
    }

    if (!btnVerMas) return;

    if (ranking.length > LIMITE_TOP) {
        const restantes = ranking.length - LIMITE_TOP;
        btnVerMas.style.display = 'inline-block';
        btnVerMas.textContent = mostrarTodos ? 'Ver menos' : `Ver mas (${restantes})`;
    } else {
        btnVerMas.style.display = 'none';
    }
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
        usuariosCargados = usuarios;

        mostrarTodos = false;
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

if (btnVerMas) {
    btnVerMas.addEventListener('click', () => {
        if (!rankingActual.length || rankingActual.length <= LIMITE_TOP) {
            return;
        }

        mostrarTodos = !mostrarTodos;
        renderTabla(usuariosCargados);
    });
}

if (busquedaNombre) {
    busquedaNombre.addEventListener('input', () => {
        mostrarTodos = false;
        renderTabla(usuariosCargados);
    });
}

if (ordenRanking) {
    ordenRanking.addEventListener('change', () => {
        mostrarTodos = false;
        renderTabla(usuariosCargados);
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        clearActiveUser();
        enviarARegistro();
    });
}