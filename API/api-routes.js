let router = require('express').Router();

router.get('/', function(req, res) {
    res.json({
        status: 'Api disponible',
        message: 'Bienvenidos a PlayAlmi'
    });
});

var userController = require('./userController');

router.route('/usuarios')
    .get(userController.index)
    .post(userController.new);

router.route('/usuarios/kills/:kills')
    .get(userController.viewgenero);

router.route('/usuarios/:user_id')
    .get(userController.view)
    .put(userController.update)
    .delete(userController.delete);

module.exports = router;
