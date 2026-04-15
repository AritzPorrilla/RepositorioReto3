let router = require('express').Router();

router.get('/', function(req, res) {
    res.json({
        status: 'Api disponible',
        message: 'Bienvenidos a PlayAlmi'
    });
});

var userController = require('./userController');

router.route('/users')
    .get(userController.index);
    /*.post(userController.new);

router.route('/users/puntos/:puntos')
    .get(userController.viewByPuntos);

router.route('/users/:user_id')
    .get(userController.view)
    .put(userController.update)
    .delete(userController.delete);
    */

module.exports = router;
