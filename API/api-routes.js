const router         = require('express').Router();
const userController = require('./userController');
 
router.get('/', (_req, res) => res.json({ status: 'ok', message: 'Bienvenidos a PlayAlmi' }));
 
router.route('/login')
    .post(userController.login);
 
router.route('/users')
    .get(userController.index)
    .post(userController.new);
 
router.route('/users/kills/:kills')
    .get(userController.viewgenero);

router.route('/ranking')
    .get(userController.ranking);

router.route('/users/:user_id')
    .get(userController.view)
    .put(userController.update)
    .delete(userController.delete);
 
module.exports = router;
 
