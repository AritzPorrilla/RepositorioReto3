const API_GET_CANDIDATAS = [
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
const perfilEstado = document.getElementById('perfil-estado');
const perfilForm = document.getElementById('perfil-form');
const perfilUsernameInput = document.getElementById('perfil-username-input');
const perfilPasswordInput = document.getElementById('perfil-password-input');
const perfilKills = document.getElementById('perfil-kills');
const perfilPuntos = document.getElementById('perfil-puntos');
const perfilFecha = document.getElementById('perfil-fecha');
const perfilFoto = document.getElementById('perfil-foto');
const perfilFotoInput = document.getElementById('perfil-foto-input');
const perfilFotoMsg = document.getElementById('perfil-foto-msg');
const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');
const navPerfilFoto = document.getElementById('nav-perfil-foto');

const PLAYALMI_SESSION_KEY = 'playalmi_active_user';
const PLAYALMI_PHOTO_KEY_PREFIX = 'playalmi_profile_photo';
const DEFAULT_API_BASE_URL = 'http://192.168.0.84:8080';
let apiBaseUrl = DEFAULT_API_BASE_URL;

const LIMITE_TOP = 10;

let rankingActual = [];
let mostrarTodos = false;
let usuariosCargados = [];
let usuarioActivo = getActiveUser();

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

function setActiveUser(user) {
    usuarioActivo = user;
    localStorage.setItem(PLAYALMI_SESSION_KEY, JSON.stringify(user));
}

function getPhotoStorageKey(username) {
    const normalizado = String(username || '').trim().toLowerCase();
    return `${PLAYALMI_PHOTO_KEY_PREFIX}:${normalizado || 'anon'}`;
}

function getPhotoPlaceholderUrl(username) {
    const texto = String(username || 'Perfil').trim() || 'Perfil';
    return `https://placehold.co/180x180/1b2819/d7ffc4?text=${encodeURIComponent(texto)}`;
}

function setApiBaseUrlFromUrl(url) {
    const texto = String(url || '');
    const indice = texto.indexOf('/api/users');
    apiBaseUrl = indice >= 0 ? texto.slice(0, indice) : DEFAULT_API_BASE_URL;
}

function resolvePhotoSrc(value, username) {
    const texto = String(value || '').trim();
    if (!texto) {
        return getPhotoPlaceholderUrl(username);
    }

    if (/^(data:|https?:\/\/)/i.test(texto)) {
        return texto;
    }

    if (texto.startsWith('/img/')) {
        return `${apiBaseUrl}${texto}`;
    }

    if (texto.startsWith('img/')) {
        return `${apiBaseUrl}/${texto}`;
    }

    return texto;
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

function setPerfilEstado(texto, tipo = 'ok') {
    if (!perfilEstado) return;

    perfilEstado.textContent = texto;
    perfilEstado.style.color = tipo === 'error' ? '#ffc7c9' : '#d7ffc4';
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

function getUsuarioActivoDesdeLista(usuarios) {
    const idSesion = String(usuarioActivo?.id || '').trim();
    const usernameSesion = String(usuarioActivo?.username || '').trim().toLowerCase();

    if (idSesion) {
        const porId = usuarios.find((usuario) => String(usuario?._id || '').trim() === idSesion);
        if (porId) return porId;
    }

    if (!usernameSesion) {
        return null;
    }

    return usuarios.find((usuario) => String(usuario?.username || '').trim().toLowerCase() === usernameSesion) || null;
}

function actualizarUIPerfil(usuario) {
    const username = String(usuario?.username || usuarioActivo?.username || '');
    const kills = usuario?.kills ?? usuarioActivo?.kills ?? 0;
    const puntos = usuario?.puntos ?? usuarioActivo?.puntos ?? 0;
    const fecha = usuario?.fecha_lanzamiento ?? usuarioActivo?.fecha_lanzamiento;
    const fotoDb = String(usuario?.foto_perfil || usuarioActivo?.foto_perfil || '');

    if (perfilUsernameInput) {
        perfilUsernameInput.value = username;
    }

    if (perfilKills) {
        perfilKills.textContent = String(kills);
    }

    if (perfilPuntos) {
        perfilPuntos.textContent = String(puntos);
    }

    if (perfilFecha) {
        perfilFecha.textContent = formatearFechaSoloYMD(fecha);
    }

    const fotoGuardada = localStorage.getItem(getPhotoStorageKey(username));
    if (perfilFoto) {
          perfilFoto.src = resolvePhotoSrc(fotoDb || fotoGuardada, username);
    }

    if (navPerfilFoto) {
          navPerfilFoto.src = resolvePhotoSrc(fotoDb || fotoGuardada, username);
    }

    if (sesionActiva) {
        sesionActiva.textContent = `Sesion activa: ${username || '-'}`;
    }
}

function prepararSesionDesdeUsuario(usuario) {
    if (!usuario) return;

    setActiveUser({
        id: usuario._id || usuarioActivo?.id || '',
        username: usuario.username || usuarioActivo?.username || '',
        puntos: usuario.puntos ?? usuarioActivo?.puntos ?? 0,
        kills: usuario.kills ?? usuarioActivo?.kills ?? 0,
        fecha_lanzamiento: usuario.fecha_lanzamiento || usuarioActivo?.fecha_lanzamiento || '',
        foto_perfil: usuario.foto_perfil || usuarioActivo?.foto_perfil || ''
    });
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

async function fetchConFallback(urls, options) {
    let ultimoError = null;

    for (const url of urls) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            setApiBaseUrlFromUrl(url);
            const payload = await response.json();
            return { payload, url };
        } catch (error) {
            ultimoError = error;
        }
    }

    throw ultimoError || new Error('No se pudo conectar con ninguna URL');
}

function getUpdateUrls(userId) {
    return [
        './proxy-update-user.php',
        `http://localhost:8080/api/users/${encodeURIComponent(userId)}`,
        `http://127.0.0.1:8080/api/users/${encodeURIComponent(userId)}`,
        `http://192.168.0.84:8080/api/users/${encodeURIComponent(userId)}`,
    ];
}

function initFotoPerfil() {
    if (!perfilFotoInput || !perfilFotoMsg) return;

    perfilFotoInput.addEventListener('change', () => {
        const archivo = perfilFotoInput.files?.[0];
        if (!archivo) return;

        if (!archivo.type.startsWith('image/')) {
            perfilFotoMsg.textContent = 'Selecciona una imagen valida.';
            perfilFotoMsg.style.color = '#ffc7c9';
            perfilFotoInput.value = '';
            return;
        }

        if (archivo.size > 2 * 1024 * 1024) {
            perfilFotoMsg.textContent = 'La imagen supera 2MB.';
            perfilFotoMsg.style.color = '#ffc7c9';
            perfilFotoInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const resultado = String(reader.result || '');
            if (!resultado) {
                perfilFotoMsg.textContent = 'No se pudo leer la imagen.';
                perfilFotoMsg.style.color = '#ffc7c9';
                return;
            }

            const key = getPhotoStorageKey(usuarioActivo?.username);
            localStorage.setItem(key, resultado);

            if (perfilFoto) {
                perfilFoto.src = resultado;
            }

            perfilFotoMsg.textContent = 'Foto actualizada correctamente.';
            perfilFotoMsg.style.color = '#bbf7b5';
        };

        reader.onerror = () => {
            perfilFotoMsg.textContent = 'Error leyendo archivo.';
            perfilFotoMsg.style.color = '#ffc7c9';
        };

        reader.readAsDataURL(archivo);
    });
}

function initPerfilForm() {
    if (!perfilForm) return;

    perfilForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const usuarioLista = getUsuarioActivoDesdeLista(usuariosCargados);
        const userId = String(usuarioLista?._id || usuarioActivo?.id || '').trim();
        if (!userId) {
            setPerfilEstado('No se encontro el usuario activo para actualizar.', 'error');
            return;
        }

        const nuevoUsername = String(perfilUsernameInput?.value || '').trim();
        const nuevoPassword = String(perfilPasswordInput?.value || '').trim();
        const usernameActual = String(usuarioLista?.username || usuarioActivo?.username || '').trim();

        if (nuevoUsername.length < 3) {
            setPerfilEstado('El username debe tener al menos 3 caracteres.', 'error');
            return;
        }

        if (nuevoPassword && nuevoPassword.length < 4) {
            setPerfilEstado('La password debe tener al menos 4 caracteres.', 'error');
            return;
        }

        const duplicado = usuariosCargados.some((usuario) => {
            const mismoId = String(usuario?._id || '').trim() === userId;
            const mismoUsername = String(usuario?.username || '').trim().toLowerCase() === nuevoUsername.toLowerCase();
            return !mismoId && mismoUsername;
        });

        if (duplicado) {
            setPerfilEstado('Ese username ya esta en uso por otro jugador.', 'error');
            return;
        }

        setPerfilEstado('Guardando perfil...');
        if (btnGuardarPerfil) {
            btnGuardarPerfil.disabled = true;
        }

        try {
            const updateUrls = getUpdateUrls(userId);
            const payloadBase = {
                username: nuevoUsername,
            };

            if (nuevoPassword) {
                payloadBase.password = nuevoPassword;
            }

            let resultado = null;
            let ultimoError = null;

            for (const url of updateUrls) {
                try {
                    const body = url === './proxy-update-user.php'
                        ? JSON.stringify({ user_id: userId, ...payloadBase })
                        : JSON.stringify(payloadBase);

                    const response = await fetch(url, {
                        method: url === './proxy-update-user.php' ? 'POST' : 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body
                    });

                    if (!response.ok) {
                        throw new Error(`Error HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    resultado = {
                        data,
                        url
                    };
                    break;
                } catch (error) {
                    ultimoError = error;
                }
            }

            if (!resultado) {
                throw ultimoError || new Error('No se pudo actualizar el perfil');
            }

            const usuarioActualizado = resultado.data?.data || {};
            const oldPhotoKey = getPhotoStorageKey(usernameActual);
            const newPhotoKey = getPhotoStorageKey(nuevoUsername);
            if (oldPhotoKey !== newPhotoKey) {
                const fotoVieja = localStorage.getItem(oldPhotoKey);
                if (fotoVieja) {
                    localStorage.setItem(newPhotoKey, fotoVieja);
                    localStorage.removeItem(oldPhotoKey);
                }
            }

            prepararSesionDesdeUsuario({
                _id: usuarioActualizado._id || userId,
                username: usuarioActualizado.username || nuevoUsername,
                kills: usuarioActualizado.kills ?? usuarioLista?.kills ?? 0,
                puntos: usuarioActualizado.puntos ?? usuarioLista?.puntos ?? 0,
                fecha_lanzamiento: usuarioActualizado.fecha_lanzamiento || usuarioLista?.fecha_lanzamiento || ''
            });

            actualizarUIPerfil(usuarioActualizado);
            setPerfilEstado('Perfil actualizado correctamente.');
            perfilPasswordInput.value = '';
            await cargarUsuarios();
        } catch (error) {
            setPerfilEstado(`No se pudo guardar perfil: ${error.message}`, 'error');
        } finally {
            if (btnGuardarPerfil) {
                btnGuardarPerfil.disabled = false;
            }
        }
    });
}

async function cargarUsuarios() {
    estado.style.display = 'block';
    estado.innerHTML = '<p>Cargando datos del bunker...</p>';
    contenido.style.display = 'none';

    try {
        const resultado = await fetchConFallback(API_GET_CANDIDATAS, { method: 'GET' });
        const payload = resultado.payload;
        const usuarios = Array.isArray(payload?.data) ? payload.data : [];
        usuariosCargados = usuarios;

        const usuarioLista = getUsuarioActivoDesdeLista(usuarios);
        if (usuarioLista) {
            prepararSesionDesdeUsuario(usuarioLista);
            actualizarUIPerfil(usuarioLista);
        } else {
            actualizarUIPerfil(usuarioActivo || {});
        }

        mostrarTodos = false;
        renderTabla(usuarios);
        totalUsuarios.textContent = String(usuarios.length);
        statusText.textContent = 'API conectada';
        estado.style.display = 'none';
        contenido.style.display = 'block';
    } catch (error) {
        statusText.textContent = 'API sin conexion';
        estado.innerHTML = `<p style="color:#ff8b8b;">Error al cargar usuarios: ${escapeHtml(error.message)}. Revisa CORS/puerto 8080 o que la API este encendida.</p>`;
        contenido.style.display = 'none';
        console.error('Error al cargar usuarios:', error);
    }
}

actualizarUIPerfil(usuarioActivo || {});
initFotoPerfil();
initPerfilForm();
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