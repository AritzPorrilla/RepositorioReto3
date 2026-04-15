let router = require('express').Router();

router.get('/', function(req,res)
{
    res.json({
        status:'Api disponible',
        message: 'Bienvenidos a NetAlmixx'
    });
});


var pelisController = require('./peliculasController');
var seriesController = require('./seriesController');

router.route('/pelis')
    .get(pelisController.index)
    .post(pelisController.new);

router.route('/pelis/genero/:genero')
    .get(pelisController.viewgenero);


router.route('/pelis/:pelicula_id')
    .get(pelisController.view)
    .put(pelisController.update)
    .delete(pelisController.delete);

router.route('/pelisyyseries/top10')
    .get(pelisController.viewtop10)

/////////////////////////////////////// SERIES /////////////////////////////////////////////////////////



router.route('/series')
    .get(seriesController.index)
    .post(seriesController.new);

router.route('/series/genero/:genero')
    .get(seriesController.viewgenero);


router.route('/series/:serie_id')
    .get(seriesController.view)
    .put(seriesController.update)
    .delete(seriesController.delete);



module.exports = router;
