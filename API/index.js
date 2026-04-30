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
app.use('/fotoperfil', express.static('/var/www/html/fotoperfil'));

let apiRoutes = require('./api-routes');
app.use('/api', apiRoutes);

// Conexion con Mongo
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'PlayAlmi';

mongoose.connect(mongoUri, { dbName: mongoDbName })
    .then(async () => {
        console.log(`Conectado a MongoDB (${mongoUri}/${mongoDbName})`);

        try {
            const dbCandidates = [mongoDbName, 'PlayAlmi', 'playAlmi'].filter((value, index, arr) => value && arr.indexOf(value) === index);
            const collectionCandidates = ['users'];

            for (const dbName of dbCandidates) {
                const db = mongoose.connection.client.db(dbName);

                for (const collectionName of collectionCandidates) {
                    const count = await db.collection(collectionName).countDocuments({});
                    console.log(`[Mongo check] ${dbName}.${collectionName} -> ${count} docs`);
                }
            }
        } catch (checkErr) {
            console.error('Error comprobando datos en MongoDB:', checkErr.message);
        }
    })
    .catch(err => console.error('Error de conexion a MongoDB:', err.message));

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
});

var port = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Web Service Reto 3'));

app.listen(port, function () {
    console.log('Runnin WS PlayAlmi');
});
