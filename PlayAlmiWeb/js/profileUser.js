const PROXY_API = window.PlayAlmiProxy;
const API_GET_CANDIDATAS = [
  (PROXY_API && PROXY_API.getUsersUrl()) || 'http://20.203.222.95:8080/api/users'
];

const PLAYALMI_SESSION_KEY = 'playalmi_active_user';
const PLAYALMI_PHOTO_KEY_PREFIX = 'playalmi_profile_photo';
const PLAYALMI_PHOTO_PENDING_SYNC_KEY_PREFIX = 'playalmi_profile_photo_pending_sync';
const INLINE_PHOTO_PREFIX = 'playalmi-inline-image::';
const API_TIMEOUT_MS = 6000;
const DEFAULT_API_BASE_URL = (() => {
  try {
    const origin = String(window.location.origin || '').trim();
    return /^https?:\/\//i.test(origin) ? origin : 'http://20.203.222.95:8080';
  } catch {
    return 'http://20.203.222.95:8080';
  }
})();
let apiBaseUrl = DEFAULT_API_BASE_URL;

const perfilEstado = document.getElementById('perfil-estado');
const sesionActiva = document.getElementById('sesion-activa');
const btnLogout = document.getElementById('btn-logout');
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
const btnEliminarCuenta = document.getElementById('btn-eliminar-cuenta');

let usuariosCargados = [];
let usuarioActivo = getActiveUser();
let fotoPerfilPreferida = '';
let confirmacionEliminarCuenta = null;

function requireProxyApi() {
  if (PROXY_API) {
    return PROXY_API;
  }

  throw new Error('Proxy API JavaScript no disponible. Revisa la carga de ./js/proxyApi.js');
}

function getActiveUser() {
  try {
    const raw = localStorage.getItem(PLAYALMI_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setActiveUser(user) {
  usuarioActivo = user;
  localStorage.setItem(PLAYALMI_SESSION_KEY, JSON.stringify(user));
}

function clearActiveUser() {
  localStorage.removeItem(PLAYALMI_SESSION_KEY);
}

function clearStoredProfilePhotos() {
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(`${PLAYALMI_PHOTO_KEY_PREFIX}:`)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
}

function enviarARegistro() {
  window.location.href = './registro.html';
}

function ocultarConfirmacionEliminarCuenta() {
  if (confirmacionEliminarCuenta) {
    confirmacionEliminarCuenta.hidden = true;
  }
}

function mostrarConfirmacionEliminarCuenta() {
  if (!perfilForm) return;

  if (!confirmacionEliminarCuenta) {
    const contenedor = document.createElement('div');
    contenedor.className = 'perfil-delete-confirm';
    contenedor.hidden = true;
    contenedor.innerHTML = `
      <div>
        <p class="perfil-delete-confirm-title">Eliminar cuenta</p>
        <p class="perfil-delete-confirm-text">Esta accion borrara tu perfil de forma definitiva. No podras recuperarlo despues.</p>
      </div>
      <div class="perfil-delete-confirm-actions">
        <button type="button" class="ghost" data-delete-cancelar>Cancelar</button>
        <button type="button" class="perfil-delete-btn" data-delete-confirmar>Si, eliminar</button>
      </div>
    `;

    const accionesPerfil = document.querySelector('.perfil-actions');
    if (accionesPerfil?.parentNode) {
      accionesPerfil.insertAdjacentElement('afterend', contenedor);
    } else {
      perfilForm.appendChild(contenedor);
    }

    const btnCancelar = contenedor.querySelector('[data-delete-cancelar]');
    const btnConfirmar = contenedor.querySelector('[data-delete-confirmar]');

    btnCancelar?.addEventListener('click', (event) => {
      event.preventDefault();
      ocultarConfirmacionEliminarCuenta();
      setPerfilEstado('Eliminacion cancelada.');
    });

    btnConfirmar?.addEventListener('click', async (event) => {
      event.preventDefault();
      ocultarConfirmacionEliminarCuenta();

      btnEliminarCuenta.disabled = true;
      if (btnGuardarPerfil) {
        btnGuardarPerfil.disabled = true;
      }

      setPerfilEstado('Eliminando cuenta...');

      try {
        await eliminarCuentaRemota();
        clearStoredProfilePhotos();
        clearActiveUser();
        fotoPerfilPreferida = '';
        enviarARegistro();
      } catch (error) {
        setPerfilEstado(`No se pudo eliminar la cuenta: ${error.message}`, 'error');
        btnEliminarCuenta.disabled = false;
        if (btnGuardarPerfil) {
          btnGuardarPerfil.disabled = false;
        }
      }
    });

    confirmacionEliminarCuenta = contenedor;
  }

  confirmacionEliminarCuenta.hidden = false;
  setPerfilEstado('Confirma si quieres eliminar la cuenta.', 'error');
}

function getPhotoStorageKey(username) {
  const normalizado = String(username || '').trim().toLowerCase();
  return `${PLAYALMI_PHOTO_KEY_PREFIX}:${normalizado || 'anon'}`;
}

function getPhotoPendingSyncStorageKey(username) {
  const normalizado = String(username || '').trim().toLowerCase();
  return `${PLAYALMI_PHOTO_PENDING_SYNC_KEY_PREFIX}:${normalizado || 'anon'}`;
}

function markPhotoPendingSync(username) {
  try {
    localStorage.setItem(getPhotoPendingSyncStorageKey(username), '1');
  } catch {
    // Best effort.
  }
}

function clearPhotoPendingSync(username) {
  try {
    localStorage.removeItem(getPhotoPendingSyncStorageKey(username));
  } catch {
    // Best effort.
  }
}

function hasPhotoPendingSync(username) {
  try {
    return localStorage.getItem(getPhotoPendingSyncStorageKey(username)) === '1';
  } catch {
    return false;
  }
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

  if (texto.startsWith(INLINE_PHOTO_PREFIX)) {
    return texto.slice(INLINE_PHOTO_PREFIX.length);
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

  if (texto.startsWith('fotoperfil/')) {
    return `/${texto}`;
  }

  return texto;
}

function obtenerFotoLocalGuardada(username) {
  return localStorage.getItem(getPhotoStorageKey(username));
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

function setPerfilEstado(texto, tipo = 'ok') {
  if (!perfilEstado) return;

  perfilEstado.textContent = texto;
  perfilEstado.style.color = tipo === 'error' ? '#ffc7c9' : '#d7ffc4';
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

function actualizarUIPerfil(usuario) {
  const username = String(usuario?.username || usuarioActivo?.username || '');
  const kills = usuario?.kills ?? usuarioActivo?.kills ?? 0;
  const puntos = usuario?.puntos ?? usuarioActivo?.puntos ?? 0;
  const fecha = usuario?.fecha_lanzamiento ?? usuarioActivo?.fecha_lanzamiento;
  const fotoDb = String(usuario?.foto_perfil || usuarioActivo?.foto_perfil || '');
  const fotoGuardada = localStorage.getItem(getPhotoStorageKey(username));
  const fotoMostrada = fotoPerfilPreferida || fotoDb || fotoGuardada;

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

  if (perfilFoto) {
    perfilFoto.src = resolvePhotoSrc(fotoMostrada, username);
  }

  if (fotoDb) {
    localStorage.setItem(getPhotoStorageKey(username), fotoDb);
  }

  if (sesionActiva) {
    sesionActiva.textContent = `Sesion activa: ${username || '-'}`;
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

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Error leyendo archivo.'));
    reader.readAsDataURL(archivo);
  });
}

function cargarImagenDesdeDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.src = dataUrl;
  });
}

function canvasToJpegDataUrl(canvas, calidad) {
  return canvas.toDataURL('image/jpeg', calidad);
}

async function optimizarImagen(archivo) {
  const dataUrlOriginal = await leerArchivoComoDataUrl(archivo);
  const image = await cargarImagenDesdeDataUrl(dataUrlOriginal);

  const maxLado = 560;
  const escala = Math.min(1, maxLado / Math.max(image.width, image.height));
  const ancho = Math.max(1, Math.round(image.width * escala));
  const alto = Math.max(1, Math.round(image.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataUrlOriginal;
  }

  ctx.drawImage(image, 0, 0, ancho, alto);

  const dataUrlComprimido = canvasToJpegDataUrl(canvas, 0.62);
  if (!dataUrlComprimido || dataUrlComprimido.length >= dataUrlOriginal.length) {
    return dataUrlOriginal;
  }

  return dataUrlComprimido;
}

async function actualizarPerfilRemoto(payloadBase) {
  const usuarioLista = getUsuarioActivoDesdeLista(usuariosCargados);
  const userId = String(usuarioLista?._id || usuarioActivo?.id || '').trim();
  if (!userId) {
    throw new Error('No se encontro el usuario activo para actualizar.');
  }

  const hasPhotoPayload = Object.prototype.hasOwnProperty.call(payloadBase || {}, 'foto_perfil');
  const api = requireProxyApi();
  const resultado = await api.updateUser(userId, payloadBase, hasPhotoPayload ? 7000 : API_TIMEOUT_MS);

  setApiBaseUrlFromUrl(resultado.url);

  const usuarioActualizado = resultado.data?.data || {};
  prepararSesionDesdeUsuario({
    _id: usuarioActualizado._id || userId,
    username: usuarioActualizado.username || usuarioActivo?.username || '',
    kills: usuarioActualizado.kills ?? usuarioActivo?.kills ?? 0,
    puntos: usuarioActualizado.puntos ?? usuarioActivo?.puntos ?? 0,
    fecha_lanzamiento: usuarioActualizado.fecha_lanzamiento || usuarioActivo?.fecha_lanzamiento || '',
    foto_perfil: usuarioActualizado.foto_perfil || usuarioActivo?.foto_perfil || ''
  });

  return { resultado, usuarioActualizado, userId };
}

async function eliminarCuentaRemota() {
  const usuarioLista = getUsuarioActivoDesdeLista(usuariosCargados);
  const userId = String(usuarioLista?._id || usuarioActivo?.id || '').trim();
  if (!userId) {
    throw new Error('No se encontro el usuario activo para eliminar.');
  }

  const api = requireProxyApi();
  const resultado = await api.deleteUser(userId, API_TIMEOUT_MS);
  setApiBaseUrlFromUrl(resultado.url);
  return resultado.data;
}

function initFotoPerfil() {
  if (!perfilFotoInput || !perfilFotoMsg) return;

  perfilFotoInput.addEventListener('change', async () => {
    const archivo = perfilFotoInput.files?.[0];
    if (!archivo) return;
    const fotoAnterior = perfilFoto ? perfilFoto.src : '';
    let fotoOptimizada = '';

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

    try {
      perfilFotoMsg.textContent = 'Optimizando imagen...';
      perfilFotoMsg.style.color = '#d7ffc4';

      fotoOptimizada = await optimizarImagen(archivo);
      if (!fotoOptimizada) {
        throw new Error('No se pudo procesar la imagen.');
      }

      if (fotoOptimizada.length > 7_500_000) {
        throw new Error('Imagen demasiado grande incluso optimizada. Elige una mas ligera.');
      }

      if (perfilFoto) {
        perfilFoto.src = fotoOptimizada;
      }

      perfilFotoMsg.textContent = 'Guardando foto en base de datos...';
      perfilFotoMsg.style.color = '#d7ffc4';

      const { usuarioActualizado } = await actualizarPerfilRemoto({ foto_perfil: fotoOptimizada });
      const username = usuarioActualizado.username || usuarioActivo?.username;
      const fotoFinal = String(usuarioActualizado.foto_perfil || fotoOptimizada).trim();
      fotoPerfilPreferida = fotoFinal;
      setActiveUser({
        ...(usuarioActivo || {}),
        username: username || usuarioActivo?.username || '',
        foto_perfil: fotoFinal
      });
      actualizarUIPerfil({
        ...usuarioActualizado,
        username: username || usuarioActivo?.username || '',
        foto_perfil: fotoFinal
      });
      perfilFotoMsg.textContent = 'Foto guardada en la API correctamente.';
      perfilFotoMsg.style.color = '#bbf7b5';
    } catch (error) {
      if (perfilFoto) {
        perfilFoto.src = fotoAnterior;
      }
      perfilFotoMsg.textContent = `No se pudo guardar la foto: ${error.message}`;
      perfilFotoMsg.style.color = '#ffc7c9';
    }
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
      const payloadBase = {
        username: nuevoUsername
      };

      if (nuevoPassword) {
        payloadBase.password = nuevoPassword;
      }

      const { resultado, usuarioActualizado } = await actualizarPerfilRemoto(payloadBase);
      const oldPhotoKey = getPhotoStorageKey(usernameActual);
      const newPhotoKey = getPhotoStorageKey(nuevoUsername);
      if (oldPhotoKey !== newPhotoKey) {
        const fotoVieja = localStorage.getItem(oldPhotoKey);
        if (fotoVieja) {
          localStorage.setItem(newPhotoKey, fotoVieja);
          localStorage.removeItem(oldPhotoKey);
        }
      }

      actualizarUIPerfil(usuarioActualizado);
      setPerfilEstado('Perfil actualizado correctamente.');
      perfilPasswordInput.value = '';
    } catch (error) {
      setPerfilEstado(`No se pudo guardar perfil: ${error.message}`, 'error');
    } finally {
      if (btnGuardarPerfil) {
        btnGuardarPerfil.disabled = false;
      }
    }
  });
}

async function cargarPerfil() {
  setPerfilEstado('Cargando perfil...');

  try {
    const api = requireProxyApi();
    const resultado = await api.getUsers(API_TIMEOUT_MS);
    const payload = resultado.data;
    setApiBaseUrlFromUrl(resultado.url);
    const usuarios = Array.isArray(payload?.data) ? payload.data : [];
    usuariosCargados = usuarios;

    const usuarioLista = getUsuarioActivoDesdeLista(usuarios);
    if (!usuarioLista) {
      throw new Error('No se encontro el usuario de la sesion activa');
    }

    prepararSesionDesdeUsuario(usuarioLista);
    actualizarUIPerfil({
      ...usuarioLista,
      foto_perfil: fotoPerfilPreferida || usuarioLista?.foto_perfil || ''
    });
    setPerfilEstado('Perfil cargado correctamente.');
  } catch (error) {
    setPerfilEstado(`Error al cargar perfil: ${error.message}`, 'error');
  }
}

if (!usuarioActivo?.username) {
  enviarARegistro();
}

if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    clearActiveUser();
    enviarARegistro();
  });
}

if (btnEliminarCuenta) {
  btnEliminarCuenta.addEventListener('click', (event) => {
    event.preventDefault();

    const username = String(usuarioActivo?.username || '').trim();
    if (!username) {
      setPerfilEstado('No hay una cuenta activa para eliminar.', 'error');
      return;
    }

    mostrarConfirmacionEliminarCuenta();
  });
}

actualizarUIPerfil(usuarioActivo || {});
initFotoPerfil();
initPerfilForm();
cargarPerfil();
