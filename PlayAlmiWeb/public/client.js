const statusApi = document.getElementById('statusApi');
const feedback = document.getElementById('feedback');
const listaUsuarios = document.getElementById('listaUsuarios');
const btnRecargar = document.getElementById('btnRecargar');

const API_BASE_URL = 'http://192.168.0.84:8080/api';

function mostrarFeedback(texto, tipo = '') {
  feedback.textContent = texto;
  feedback.className = `feedback ${tipo}`.trim();
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin fecha';
  return new Date(fechaIso).toLocaleString('es-ES');
}

function renderizarUsuarios(usuarios) {
  if (!usuarios.length) {
    listaUsuarios.innerHTML = '<li>No hay usuarios todavía.</li>';
    return;
  }

  listaUsuarios.innerHTML = usuarios
    .map((usuario) => {
      const usernameSeguro = String(usuario.username ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const puntosSeguro = String(usuario.puntos ?? '0');
      const killsSeguro = String(usuario.kills ?? 'Sin kills').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fechaSeguro = formatearFecha(usuario.fecha_lanzamiento);

      return `
        <li>
          <strong>${usernameSeguro}</strong>
          <p>Puntos: ${puntosSeguro}</p>
          <p>Kills: ${killsSeguro}</p>
          <p class="meta">Fecha: ${fechaSeguro}</p>
        </li>
      `;
    })
    .join('');
}

async function cargarUsuarios() {
  try {
    const respuesta = await fetch(`${API_BASE_URL}/users`);
    if (!respuesta.ok) throw new Error('No fue posible cargar los usuarios');

    const datos = await respuesta.json();
    const usuarios = Array.isArray(datos?.data) ? datos.data : [];
    renderizarUsuarios(usuarios);
    statusApi.textContent = 'API conectada';
    mostrarFeedback('Usuarios cargados desde la API.', 'ok');
  } catch (error) {
    statusApi.textContent = 'API sin conexión';
    mostrarFeedback('Error al cargar usuarios desde la API.', 'error');
  }
}

async function verificarApi() {
  try {
    const respuesta = await fetch(`${API_BASE_URL}/users`);
    if (!respuesta.ok) throw new Error();
    statusApi.textContent = 'API conectada';
  } catch {
    statusApi.textContent = 'API sin conexión';
  }
}

btnRecargar.addEventListener('click', cargarUsuarios);

verificarApi();
cargarUsuarios();
