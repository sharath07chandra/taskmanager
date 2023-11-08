const userController = require('./controllers/userController');

module.exports = (router) => {
    router.route('/users').get(userController.getUsers);
    router.route('/users').post(userController.createUser);
    router.route('/users/:id').get(userController.getUserById);
    router.route('/users/:id').put(userController.updateUser);
    router.route('/users/:id').delete(userController.deleteUser);
    return router;
};