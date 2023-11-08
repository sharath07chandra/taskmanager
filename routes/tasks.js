const taskController = require('./controllers/taskController');

module.exports = (router) => {
    router.route('/tasks').get(taskController.getTasks);
    router.route('/tasks').post(taskController.createTask);
    router.route('/tasks/:id').get(taskController.getTaskById);
    router.route('/tasks/:id').put(taskController.updateTask);
    router.route('/tasks/:id').delete(taskController.deleteTask);
    return router;
};