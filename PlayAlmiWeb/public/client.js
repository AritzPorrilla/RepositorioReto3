const statusApi = document.getElementById('statusApi');
const feedback = document.getElementById('feedback');
const formMensaje = document.getElementById('formMensaje');
const listaMensajes = document.getElementById('listaMensajes');
const btnRecargar = document.getElementById('btnRecargar');

function mostrarFeedback(texto, tipo = '') {
  feedback.textContent = texto;
  feedback.className = `feedback ${tipo}`.trim();
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin fecha';
  return new Date(fechaIso).toLocaleString('es-ES');
}

function renderizarMensajes(mensajes) {
  if (!mensajes.length) {
    listaMensajes.innerHTML = '<li>No hay mensajes todavía.</li>';
    return;
  }

  listaMensajes.innerHTML = mensajes
    .map((mensaje) => {
      const nombreSeguro = String(mensaje.nombre ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const contenidoSeguro = String(mensaje.contenido ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return `
        <li>
          <strong>${nombreSeguro}</strong>
          <p>${contenidoSeguro}</p>
          <p class="meta">${formatearFecha(mensaje.createdAt)}</p>
        </li>
      `;
    })
    .join('');
}

async function cargarMensajes() {
  try {
    const respuesta = await fetch('/api/mensajes');
    if (!respuesta.ok) throw new Error('No fue posible cargar los mensajes');

    const mensajes = await respuesta.json();
    renderizarMensajes(mensajes);
    statusApi.textContent = 'API conectada';
  } catch (error) {
    statusApi.textContent = 'API sin conexión';
    mostrarFeedback('Error al cargar mensajes desde la API.', 'error');
  }
}

async function verificarApi() {
  try {
    const respuesta = await fetch('/api/health');
    if (!respuesta.ok) throw new Error();
    statusApi.textContent = 'API conectada';
  } catch {
    statusApi.textContent = 'API sin conexión';
  }
}

formMensaje.addEventListener('submit', async (event) => {
  event.preventDefault();
  mostrarFeedback('Guardando mensaje...');

  const formData = new FormData(formMensaje);
  const payload = {
    nombre: String(formData.get('nombre') || '').trim(),
    contenido: String(formData.get('contenido') || '').trim()
  };

  if (!payload.nombre || !payload.contenido) {
    mostrarFeedback('Completa nombre y mensaje.', 'error');
    return;
  }

  try {
    const respuesta = await fetch('/api/mensajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!respuesta.ok) throw new Error('Error al guardar');

    formMensaje.reset();
    mostrarFeedback('Mensaje guardado en MongoDB.', 'ok');
    await cargarMensajes();
  } catch (error) {
    mostrarFeedback('No se pudo guardar el mensaje.', 'error');
  }
});

btnRecargar.addEventListener('click', cargarMensajes);

verificarApi();
cargarMensajes();
