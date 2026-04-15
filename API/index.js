//IMPORTAR EXPRESS

let express = require('express');

//IMPORTAR BODY PARSER

let bodyParser = require('body-parser');

//IMPORTAR MONGOSE

let mongoose = require('mongoose');

//INICIALIZAR SERVIDOR
let app = express();
app.use(express.json());

app.use(bodyParser.urlencoded(
    {
        extended: true
    }
));

let apiRoutes = require("./api-routes");
app.use('/api', apiRoutes);

app.use(bodyParser.json())

//CONEXION CON MONGO

mongoose.connect('mongodb://localhost/PlayAlmi');
var db= mongoose.connection;
if(!db){
    console.log("Error conecting DB");
}else{
    console.log("DB Conected");
};

var port = process.env.PORT || 8080;

//URL POR DEFECTO

app.get('/', (req,res) => res.send('Web Service Reto 3'));

app.listen(port,function()
{
    console.log("Runnin WS PlayAlmi");
});



