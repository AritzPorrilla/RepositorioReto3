const API_USERS_DIRECT_URL = 'http://20.203.222.95:8080/api/users';
const API_POST_CANDIDATAS = [API_USERS_DIRECT_URL];
const API_GET_USERS = [API_USERS_DIRECT_URL];

const formRegistro = document.getElementById('form-registro');
const formLogin = document.getElementById('form-login');
const feedback = document.getElementById('feedback-registro');
const statusRegistro = document.getElementById('status-registro');
const fotoPerfilFileInput = document.getElementById('foto_perfil_file');
const fotoPerfilFileMsg = document.getElementById('foto_perfil_file_msg');
const PLAYALMI_SESSION_KEY = 'playalmi_active_user';
const API_TIMEOUT_MS = 10000;
const LAST_OK_POST_USERS_KEY = 'playalmi_last_ok_post_users';
const LAST_OK_GET_USERS_KEY = 'playalmi_last_ok_get_users';
const INLINE_PHOTO_PREFIX = 'playalmi-inline-image::';

function empaquetarFotoParaApi(value) {
  const texto = String(value || '').trim();
  if (!texto) return '';
  if (!/^data:image\//i.test(texto)) return texto;
  return `${INLINE_PHOTO_PREFIX}${texto}`;
}

function isFileProtocol() {
  try {
    return String(window.location.protocol || '').toLowerCase() === 'file:';
  } catch {
    return false;
  }
}

function isHttpsProtocol() {
  try {
    return String(window.location.protocol || '').toLowerCase() === 'https:';
  } catch {
    return false;
  }
}

function validarProtocoloApiCompatible() {
  if (!isHttpsProtocol()) {
    return true;
  }

  statusRegistro.textContent = 'Error de conexion con API';
  mostrarFeedback('La API solo responde por HTTP. Abre la web en HTTP (no HTTPS) o usa un proxy backend.', 'error');
  return false;
}

function ordenarCandidatas(urls, lastOkKey) {
  let filtradas = [...urls];

  if (isFileProtocol()) {
    filtradas = filtradas.filter((url) => !String(url || '').startsWith('./'));
  }

  if (isHttpsProtocol()) {
    filtradas = filtradas.filter((url) => {
      const value = String(url || '').trim();
      if (value.startsWith('./')) return true;
      return value.startsWith('https://');
    });
  }

  try {
    const lastOk = String(localStorage.getItem(lastOkKey) || '').trim();
    if (lastOk && filtradas.includes(lastOk)) {
      return [lastOk, ...filtradas.filter((url) => url !== lastOk)];
    }
  } catch {
    // Best effort.
  }

  return filtradas;
}

function guardarUltimaUrlOk(lastOkKey, url) {
  try {
    localStorage.setItem(lastOkKey, String(url || ''));
  } catch {
    // Best effort.
  }
}

async function fetchConTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function setActiveUser(user) {
  localStorage.setItem(PLAYALMI_SESSION_KEY, JSON.stringify(user));
}

function getActiveUser() {
  try {
    const raw = localStorage.getItem(PLAYALMI_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function irARanking() {
  window.location.href = './index.html';
}

function mostrarFeedback(texto, tipo) {
  feedback.style.display = 'block';
  feedback.className = `feedback ${tipo}`.trim();
  feedback.textContent = texto;
}

function limpiarErroresLogin() {
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  userInput?.classList.remove('input-error');
  passInput?.classList.remove('input-error');
}

function validarLoginAntesDeEnviar(username, password) {
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;

  limpiarErroresLogin();

  if (!username) {
    userInput?.classList.add('input-error');
    mostrarFeedback('El usuario es obligatorio.', 'error');
    statusRegistro.textContent = 'Error de validacion';
    return false;
  }

  if (!usernameRegex.test(username)) {
    userInput?.classList.add('input-error');
    mostrarFeedback('Usuario invalido: usa 3-30 caracteres, letras, numeros, _ o -.', 'error');
    statusRegistro.textContent = 'Error de validacion';
    return false;
  }

  if (!password) {
    passInput?.classList.add('input-error');
    mostrarFeedback('La contraseña es obligatoria.', 'error');
    statusRegistro.textContent = 'Error de validacion';
    return false;
  }

  if (password.length < 4) {
    passInput?.classList.add('input-error');
    mostrarFeedback('La contraseña debe tener al menos 4 caracteres.', 'error');
    statusRegistro.textContent = 'Error de validacion';
    return false;
  }

  return true;
}

function esUsernameLoginValido(username) {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(String(username || '').trim());
}

function esPasswordLoginValido(password) {
  return String(password || '').length >= 4;
}

function restaurarEstadoLoginSiValido() {
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');

  const username = String(loginUsernameInput?.value || '').trim();
  const password = String(loginPasswordInput?.value || '').trim();

  const usernameValido = esUsernameLoginValido(username);
  const passwordValida = esPasswordLoginValido(password);

  if (usernameValido) {
    loginUsernameInput?.classList.remove('input-error');
  }

  if (passwordValida) {
    loginPasswordInput?.classList.remove('input-error');
  }

  if (!usernameValido || !passwordValida) {
    return;
  }

  if (feedback.classList.contains('error')) {
    feedback.style.display = 'none';
    feedback.className = 'feedback';
    feedback.textContent = '';
  }

  statusRegistro.textContent = 'Listo para continuar';
}

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(archivo);
  });
}

function cargarImagenDesdeDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
    image.src = dataUrl;
  });
}

async function optimizarImagenArchivo(archivo) {
  if (archivo.size <= 500 * 1024) {
    return await leerArchivoComoDataUrl(archivo);
  }

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
  const dataUrlComprimido = canvas.toDataURL('image/jpeg', 0.62);

  if (!dataUrlComprimido || dataUrlComprimido.length >= dataUrlOriginal.length) {
    return dataUrlOriginal;
  }

  return dataUrlComprimido;
}

async function reducirDataUrlImagen(dataUrl, maxLado = 320, calidad = 0.55) {
  const image = await cargarImagenDesdeDataUrl(dataUrl);
  const escala = Math.min(1, maxLado / Math.max(image.width, image.height));
  const ancho = Math.max(1, Math.round(image.width * escala));
  const alto = Math.max(1, Math.round(image.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataUrl;
  }

  ctx.drawImage(image, 0, 0, ancho, alto);
  const compacta = canvas.toDataURL('image/jpeg', calidad);
  return compacta || dataUrl;
}

async function resolverFotoPerfilRegistro() {
  const archivo = fotoPerfilFileInput?.files?.[0] || null;

  if (!archivo) {
    if (fotoPerfilFileMsg) {
      fotoPerfilFileMsg.textContent = 'PNG/JPG/WebP/GIF. Maximo 2MB.';
      fotoPerfilFileMsg.style.color = '';
    }

    return '';
  }

  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo de foto debe ser una imagen valida.');
  }

  if (archivo.size > 2 * 1024 * 1024) {
    throw new Error('La foto de perfil supera 2MB.');
  }

  const fotoOptimizada = await optimizarImagenArchivo(archivo);

  if (fotoPerfilFileMsg) {
    fotoPerfilFileMsg.textContent = 'Imagen lista para enviar.';
    fotoPerfilFileMsg.style.color = '#bbf7b5';
  }

  return fotoOptimizada;
}

async function postConFallback(payload) {
  let ultimoError = null;
  const candidatas = ordenarCandidatas(API_POST_CANDIDATAS, LAST_OK_POST_USERS_KEY);

  for (const url of candidatas) {
    try {
      const response = await fetchConTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, API_TIMEOUT_MS);

      const raw = await response.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Respuesta no JSON desde ${url}`);
      }

      if (!response.ok) {
        const mensajeApi = String(data?.message || data?.error || '').trim();
        const error = new Error(mensajeApi || `Error HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      guardarUltimaUrlOk(LAST_OK_POST_USERS_KEY, url);
      return { data, url };
    } catch (error) {
      if (String(error?.name || '') === 'AbortError') {
        ultimoError = new Error(`Tiempo de espera agotado al conectar con ${url}`);
      } else if (String(error?.name || '') === 'TypeError') {
        ultimoError = new Error(`Fallo de red al conectar con ${url}`);
      } else {
        ultimoError = error;
      }
    }
  }

  throw ultimoError || new Error('No se pudo enviar a ninguna URL de API');
}

async function cargarUsuariosExistentes() {
  let ultimoError = null;
  const candidatas = ordenarCandidatas(API_GET_USERS, LAST_OK_GET_USERS_KEY);

  for (const url of candidatas) {
    try {
      const response = await fetchConTimeout(url, { method: 'GET' }, API_TIMEOUT_MS);
      if (!response.ok) {
        const error = new Error(`Error HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const raw = await response.text();
      let payload;

      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(`Respuesta no JSON desde ${url}`);
      }

      guardarUltimaUrlOk(LAST_OK_GET_USERS_KEY, url);
      return Array.isArray(payload?.data) ? payload.data : [];
    } catch (error) {
      if (String(error?.name || '') === 'AbortError') {
        ultimoError = new Error(`Tiempo de espera agotado al conectar con ${url}`);
      } else if (String(error?.name || '') === 'TypeError') {
        ultimoError = new Error(`Fallo de red al conectar con ${url}`);
      } else {
        ultimoError = error;
      }
    }
  }

  throw ultimoError || new Error('No se pudo consultar usuarios existentes');
}

if (formRegistro) {
formRegistro.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!validarProtocoloApiCompatible()) {
    return;
  }

  const username = String(document.getElementById('username').value || '').trim();
  const password = String(document.getElementById('password').value || '').trim();

  if (username.length < 3 || password.length < 4) {
    mostrarFeedback('Usuario minimo 3 caracteres y password minimo 4.', 'error');
    return;
  }

  statusRegistro.textContent = 'Enviando a API...';
  feedback.style.display = 'none';

  const fechaLanzamiento = new Date().toISOString();

  let fotoPerfil = '';

  try {
    fotoPerfil = await resolverFotoPerfilRegistro();
  } catch (errorFoto) {
    statusRegistro.textContent = 'Error de validacion';
    mostrarFeedback(String(errorFoto?.message || 'No se pudo procesar la foto de perfil.'), 'error');
    if (fotoPerfilFileMsg) {
      fotoPerfilFileMsg.textContent = String(errorFoto?.message || 'No se pudo procesar la foto de perfil.');
      fotoPerfilFileMsg.style.color = '#ffc7c9';
    }
    return;
  }

  const payload = {
    username,
    password,
    fecha_lanzamiento: fechaLanzamiento,
    kills: '0',
    puntos: 0,
    foto_perfil: empaquetarFotoParaApi(fotoPerfil)
  };

  try {
    let resultado = null;

    try {
      resultado = await postConFallback(payload);
    } catch (errorRegistroConFoto) {
      const esErrorFotoServidor = Number(errorRegistroConFoto?.status || 0) === 500 && Boolean(fotoPerfil);
      if (!esErrorFotoServidor) {
        throw errorRegistroConFoto;
      }

      // Reintento: algunos servidores aceptan solo imagenes mas pequenas.
      try {
        const fotoCompat = await reducirDataUrlImagen(fotoPerfil, 320, 0.50);
        const payloadFotoReducida = {
          ...payload,
          foto_perfil: empaquetarFotoParaApi(fotoCompat)
        };
        resultado = await postConFallback(payloadFotoReducida);
        fotoPerfil = fotoCompat;
      } catch {
        const payloadSinFoto = {
          ...payload,
          foto_perfil: ''
        };

        resultado = await postConFallback(payloadSinFoto);
        if (fotoPerfilFileMsg) {
          fotoPerfilFileMsg.textContent = 'Foto guardada temporalmente en este navegador. Se sincronizara automaticamente.';
          fotoPerfilFileMsg.style.color = '#ffd27a';
        }

        try {
          const usernameNormalizado = String(username || '').trim().toLowerCase();
          if (usernameNormalizado) {
            localStorage.setItem(`playalmi_profile_photo:${usernameNormalizado}`, fotoPerfil);
            localStorage.setItem(`playalmi_profile_photo_pending_sync:${usernameNormalizado}`, '1');
          }
        } catch {
          // Best effort.
        }
      }
    }

    statusRegistro.textContent = 'Registrado correctamente';
    mostrarFeedback('Jugador creado correctamente. Entrando al ranking...', 'ok');

    const creado = resultado?.data?.data || {};

    setActiveUser({
      id: creado._id || '',
      username: creado.username || username,
      puntos: creado.puntos ?? payload.puntos,
      kills: creado.kills ?? payload.kills,
      fecha_lanzamiento: creado.fecha_lanzamiento || payload.fecha_lanzamiento,
      foto_perfil: creado.foto_perfil || fotoPerfil || ''
    });

    formRegistro.reset();
    setTimeout(irARanking, 450);
  } catch (error) {
    if (Number(error?.status || 0) === 409) {
      statusRegistro.textContent = 'Usuario duplicado';
      mostrarFeedback('Ese usuario ya existe. Elige otro nombre.', 'error');
      return;
    }

    statusRegistro.textContent = 'Error de conexion con API';
    const mensajeError = String(error?.message || 'Error desconocido');
    if (isFileProtocol()) {
      mostrarFeedback(`No se pudo crear el jugador: ${mensajeError}. Abre la web desde un servidor (por ejemplo Apache/XAMPP o Live Server).`, 'error');
      return;
    }

    mostrarFeedback(`No se pudo crear el jugador: ${mensajeError}`, 'error');
  }
});
}

if (formLogin) {
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');

  loginUsernameInput?.addEventListener('input', () => {
    if (loginUsernameInput.classList.contains('input-error')) {
      loginUsernameInput.classList.remove('input-error');
    }

    restaurarEstadoLoginSiValido();
  });

  loginPasswordInput?.addEventListener('input', () => {
    if (loginPasswordInput.classList.contains('input-error')) {
      loginPasswordInput.classList.remove('input-error');
    }

    restaurarEstadoLoginSiValido();
  });

  formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validarProtocoloApiCompatible()) {
      return;
    }

    const username = String(document.getElementById('login-username').value || '').trim();
    const password = String(document.getElementById('login-password').value || '').trim();

    if (!validarLoginAntesDeEnviar(username, password)) {
      return;
    }

    statusRegistro.textContent = 'Verificando usuario...';
    feedback.style.display = 'none';
    limpiarErroresLogin();

    const MENSAJE_LOGIN_INVALIDO = 'Usuario o contraseña incorrectos';
    const MENSAJE_LOGIN_CONEXION = 'No se pudo conectar con la API';

    try {
      const usuarios = await cargarUsuariosExistentes();
      const usuario = usuarios.find((item) => String(item?.username || '').trim().toLowerCase() === username.toLowerCase());

      if (!usuario || String(usuario.password || '') !== password) {
        throw new Error(MENSAJE_LOGIN_INVALIDO);
      }

      setActiveUser({
        id: usuario._id || '',
        username: usuario.username,
        puntos: usuario.puntos ?? 0,
        kills: usuario.kills ?? 0,
        fecha_lanzamiento: usuario.fecha_lanzamiento || '',
        foto_perfil: usuario.foto_perfil || ''
      });

      statusRegistro.textContent = `Sesion iniciada como ${usuario.username}`;
      mostrarFeedback('Acceso correcto. Entrando al ranking...', 'ok');
      formLogin.reset();
      limpiarErroresLogin();
      setTimeout(irARanking, 350);
    } catch (error) {
      const esConexion = String(error?.message || '').toLowerCase().includes('no se pudo consultar usuarios');
      const mensaje = esConexion ? MENSAJE_LOGIN_CONEXION : MENSAJE_LOGIN_INVALIDO;
      statusRegistro.textContent = esConexion ? 'Error de conexion con API' : 'No se pudo iniciar sesion';
      loginUsernameInput?.classList.add('input-error');
      loginPasswordInput?.classList.add('input-error');
      mostrarFeedback(mensaje, 'error');
    }
  });
}

const usuarioActivo = getActiveUser();
if (usuarioActivo?.username) {
  statusRegistro.textContent = `Sesion activa: ${usuarioActivo.username}`;
}

if (fotoPerfilFileInput && fotoPerfilFileMsg) {
  fotoPerfilFileInput.addEventListener('change', () => {
    const archivo = fotoPerfilFileInput.files?.[0];

    if (!archivo) {
      fotoPerfilFileMsg.textContent = 'PNG/JPG/WebP/GIF. Maximo 2MB.';
      fotoPerfilFileMsg.style.color = '';
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      fotoPerfilFileMsg.textContent = 'Selecciona una imagen valida (PNG/JPG/WebP/GIF).';
      fotoPerfilFileMsg.style.color = '#ffc7c9';
      fotoPerfilFileInput.value = '';
      return;
    }

    if (archivo.size > 2 * 1024 * 1024) {
      fotoPerfilFileMsg.textContent = 'La imagen supera 2MB.';
      fotoPerfilFileMsg.style.color = '#ffc7c9';
      fotoPerfilFileInput.value = '';
      return;
    }

    fotoPerfilFileMsg.textContent = `Imagen seleccionada: ${archivo.name}`;
    fotoPerfilFileMsg.style.color = '#bbf7b5';
  });
}
