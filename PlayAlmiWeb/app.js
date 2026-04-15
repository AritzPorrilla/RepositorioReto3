const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'archivo.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

const mensajeSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    contenido: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const Mensaje = mongoose.model('Mensaje', mensajeSchema);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mensaje: 'API conectada' });
});

app.get('/api/mensajes', async (_req, res) => {
  try {
    const mensajes = await Mensaje.find().sort({ createdAt: -1 });
    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los mensajes' });
  }
});

app.post('/api/mensajes', async (req, res) => {
  try {
    const { nombre, contenido } = req.body;

    if (!nombre || !contenido) {
      return res.status(400).json({ error: 'nombre y contenido son obligatorios' });
    }

    const nuevoMensaje = await Mensaje.create({ nombre, contenido });
    res.status(201).json(nuevoMensaje);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar el mensaje' });
  }
});

async function iniciarServidor() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('No existe la variable MONGO_URI en archivo.env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    process.exit(1);
  }
}

iniciarServidor();