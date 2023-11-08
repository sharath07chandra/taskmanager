const Task = require('../../models/task');
const User = require('../../models/user');
const ObjectId = require("mongoose").Types.ObjectId;
const messages = require('../../Constants/messages');

const deletePendingTaskValues = async (res, assignedUserId, taskIds) => {
  try {
    let filter = !assignedUserId
      ? {
        pendingTasks: { $in: [...taskIds] },
      }
      : {
        pendingTasks: { $in: [...taskIds] },
        _id: {
          $ne: assignedUserId,
        },
      };

    await UserModel.updateMany(filter, {
      $pullAll: { pendingTasks: [...taskIds] },
    });
    return true;
  } catch (error) {
    res.status(500).json({ message: messages.user_updated_failed, data: 'Internal Server Error' });
    return false;
  }
};

const pushTaskToUser = async (res, assignedUserId, taskId) => {
  try {
    await User.findByIdAndUpdate(
      assignedUserId,
      { $push: { pendingTasks: taskId } },
      { new: true }
    );
    return true;
  } catch (error) {
    res.status(500).json({ message: messages.something_wrong, data: error.message });
    return false;
  }
};

const validateUserId = async (res, request) => {
  try {
    let request_copy = request;
    let assignedUser = request.assignedUser;
    let assignedUserName = request.assignedUserName;

    if (assignedUser && assignedUser !== "") {
      if (!ObjectId.isValid(assignedUser)) {
        res.status(400).json({ message: messages.invalid_userid, data: error.message });
        return null;
      }
      var data = await userService.getUserById(assignedUser);

      if (data.length == 0) {
        res.status(400).json({ message: messages.user_notfound, data: error.message });
        return null;
      }

      let userName = data[0].name;
      if (assignedUserName !== undefined) {
        if (userName !== request.assignedUserName) {
          res.status(400).json({ message: messages.invalid_data, data: error.message });
          return null;
        }
      } else {
        request_copy["assignedUserName"] = userName;
      }
    }
    return request_copy;
  } catch (error) {
    res.status(500).json({ message: messages.something_wrong, data: error.message });
    return null;
  }
};

// Controller methods for the Task model
const taskController = {
  getTasks: async (req, res) => {
    try {
      const { where, sort, select, skip, limit, count } = req.query;
      let query = Task.find();

      if (where) {
        query = query.find(JSON.parse(where));
      }

      if (sort) {
        query = query.sort(JSON.parse(sort));
      }

      if (select) {
        query = query.select(JSON.parse(select));
      }

      if (skip) {
        query = query.skip(parseInt(skip));
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      } else {
        query = query.limit(100); // Default limit for tasks
      }

      if (count === 'true') {
        const totalCount = await Task.countDocuments(query);
        return res.json({ message: messages.ok, data: totalCount });
      } else {
        const tasks = await query.exec();
        res.json({ message: messages.ok, data: tasks });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    }
  },

  createTask: async (req, res) => {
    const taskData = req.body;

    if (!taskData.name || !taskData.deadline) {
      return res.status(400).json({ message: messages.name_required, data: null });
    }

    let updatedData = await validateUserId(res, taskData);

    const task = new Task({
      name: updatedData.name,
      description: updatedData.description,
      deadline: updatedData.deadline,
      completed: updatedData.completed,
      assignedUser: updatedData.assignedUser,
      assignedUserName: updatedData.assignedUserName,
    });

    try {
      const new_task = await task.save();

      if (req.body.assignedUser && req.body.assignedUser !== "") {
        let pushTaskToAssignedUserStatus =
          await pushTaskToUser(
            res,
            new_task.assignedUser,
            new_task._id
          );
        if (!pushTaskToAssignedUserStatus) {
          return;
        }
      }
      res.status(201).json({ message: messages.task_created, data: new_task });
    }
    catch (err) {
      res.status(500).json({ message: messages.something_wrong, data: err.message });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: messages.task_notfound, data: `Task not found : ${req.params.id}` });
      }
      res.status(200).json({ message: messages.ok, data: task });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: err.message });
    }
  },

  updateTask: async (req, res) => {
    try {
      const taskId = req.params.id;
      const updatedTaskData = req.body;

      const existingTask = await Task.findById(taskId);

      if (!existingTask) {
        return res.status(404).json({ message: messages.task_notfound, data: 'Task not found' });
      }

      if (updatedTaskData.assignedUser !== existingTask.assignedUser) {
        if (existingTask.assignedUser) {
          const oldAssignedUser = await User.findById(existingTask.assignedUser);
          if (oldAssignedUser) {
            oldAssignedUser.pendingTasks.pull(taskId);
            await oldAssignedUser.save();
          }
        }

        const newAssignedUser = await User.findById(updatedTaskData.assignedUser);
        if (newAssignedUser) {
          newAssignedUser.pendingTasks.push(taskId);
          updatedTaskData.assignedUserName = newAssignedUser.name;
          await newAssignedUser.save();
        }
      }

      const updatedTask = await Task.findByIdAndUpdate(taskId, updatedTaskData, {
        new: true,
      });

      res.status(200).json({ message: messages.ok, data: updatedTask });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: err.message });
    }
  },

  deleteTask: async (req, res) => {
    try {
      const taskId = req.params.id;

      const existingTask = await Task.findById(taskId);

      if (!existingTask) {
        return res.status(404).json({ message: messages.task_notfound, data: 'Task not found' });
      }

      if (existingTask.assignedUser) {
        const assignedUser = await User.findById(existingTask.assignedUser);
        if (assignedUser) {
          assignedUser.pendingTasks.pull(taskId);
          await assignedUser.save();
        }
      }

      const deletedTask = await Task.findByIdAndRemove(taskId);

      res.status(200).json({ message: messages.ok, data: deletedTask });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: err.message });
    }
  },
};

module.exports = taskController;