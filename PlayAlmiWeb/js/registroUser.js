const API_POST_CANDIDATAS = [
  './proxy-create-user.php',
  'http://192.168.0.233:8080/api/users'
];

const API_GET_USERS = ['./proxy-users.php', 'http://192.168.0.233:8080/api/users'];

const formRegistro = document.getElementById('form-registro');
const formLogin = document.getElementById('form-login');
const feedback = document.getElementById('feedback-registro');
const statusRegistro = document.getElementById('status-registro');
const PLAYALMI_SESSION_KEY = 'playalmi_active_user';

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

async function postConFallback(payload) {
  let ultimoError = null;

  for (const url of API_POST_CANDIDATAS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const raw = await response.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Respuesta no JSON desde ${url}`);
      }

      return { data, url };
    } catch (error) {
      ultimoError = error;
    }
  }

  throw ultimoError || new Error('No se pudo enviar a ninguna URL de API');
}

async function cargarUsuariosExistentes() {
  let ultimoError = null;

  for (const url of API_GET_USERS) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const raw = await response.text();
      let payload;

      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(`Respuesta no JSON desde ${url}`);
      }

      return Array.isArray(payload?.data) ? payload.data : [];
    } catch (error) {
      ultimoError = error;
    }
  }

  throw ultimoError || new Error('No se pudo consultar usuarios existentes');
}

formRegistro.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = String(document.getElementById('username').value || '').trim();
  const password = String(document.getElementById('password').value || '').trim();

  if (username.length < 3 || password.length < 4) {
    mostrarFeedback('Usuario minimo 3 caracteres y password minimo 4.', 'error');
    return;
  }

  statusRegistro.textContent = 'Enviando a API...';
  feedback.style.display = 'none';

  const payload = {
    username,
    password,
    fecha_lanzamiento: new Date().toISOString(),
    kills: '0',
    puntos: 0
  };

  try {
    const usuarios = await cargarUsuariosExistentes();
    const duplicado = usuarios.some((usuario) => String(usuario?.username || '').trim().toLowerCase() === username.toLowerCase());

    if (duplicado) {
      statusRegistro.textContent = 'Usuario duplicado';
      mostrarFeedback('Ese usuario ya existe. Elige otro nombre.', 'error');
      return;
    }

    const resultado = await postConFallback(payload);
    statusRegistro.textContent = 'Registrado correctamente';
    mostrarFeedback('Jugador creado correctamente. Entrando al ranking...', 'ok');

    const creado = resultado?.data?.data || {};

    setActiveUser({
      id: creado._id || '',
      username: creado.username || username,
      puntos: creado.puntos ?? payload.puntos,
      kills: creado.kills ?? payload.kills,
      fecha_lanzamiento: creado.fecha_lanzamiento || payload.fecha_lanzamiento,
      foto_perfil: creado.foto_perfil || ''
    });

    formRegistro.reset();
    setTimeout(irARanking, 450);
  } catch (error) {
    statusRegistro.textContent = 'Error de conexion con API';
    mostrarFeedback(`No se pudo crear el jugador: ${error.message}`, 'error');
  }
});

if (formLogin) {
  formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = String(document.getElementById('login-username').value || '').trim();
    const password = String(document.getElementById('login-password').value || '').trim();

    if (username.length < 3 || password.length < 4) {
      mostrarFeedback('Usuario minimo 3 caracteres y password minimo 4.', 'error');
      return;
    }

    statusRegistro.textContent = 'Verificando usuario...';
    feedback.style.display = 'none';

    const MENSAJE_LOGIN_INVALIDO = 'Usuario o contraseña incorrectos';

    try {
      const usuarios = await cargarUsuariosExistentes();
      const usuario = usuarios.find((item) => String(item?.username || '').trim().toLowerCase() === username.toLowerCase());

      if (!usuario) {
        throw new Error(MENSAJE_LOGIN_INVALIDO);
      }

      if (String(usuario.password || '') !== password) {
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
      setTimeout(irARanking, 350);
    } catch (error) {
      statusRegistro.textContent = 'No se pudo iniciar sesion';
      mostrarFeedback(MENSAJE_LOGIN_INVALIDO, 'error');
    }
  });
}

const usuarioActivo = getActiveUser();
if (usuarioActivo?.username) {
  statusRegistro.textContent = `Sesion activa: ${usuarioActivo.username}`;
}
