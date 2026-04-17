// Importar express

let express = require('express');
let path = require('path');
let cors = require('cors');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

// Inicializar servidor
let app = express();

// Configuracion
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(bodyParser.json({ limit: '12mb' }));

app.use('/img', express.static(path.join(__dirname, '..', 'PlayAlmiWeb', 'img')));

let apiRoutes = require('./api-routes');
app.use('/api', apiRoutes);

// Conexion con Mongo
mongoose.connect('mongodb://localhost/PlayAlmi');
var db = mongoose.connection;
if (!db) {
    console.log('Error conecting DB');
} else {
    console.log('DB Conected');
}

var port = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Web Service Reto 3'));

app.listen(port, function () {
    console.log('Runnin WS PlayAlmi');
});
