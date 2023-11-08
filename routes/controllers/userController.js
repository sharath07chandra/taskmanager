const User = require('../../models/user');
const Task = require('../../models/task');
const messages = require('../../Constants/messages');

const validatePendingTasks = async (res, pendingTasksFromRequest) => {
  try {
    if (pendingTasksFromRequest && pendingTasksFromRequest.length != 0) {
      var invalidRequestIds = [];
      pendingTasksFromRequest.forEach((task) => {
        if (!ObjectId.isValid(task)) {
          invalidRequestIds.push(task);
        }
      });
      if (invalidRequestIds.length > 0) {
        res.status(400).json({ message: messages.invalid_pending_task, data: { pendingTasks: invalidRequestIds } });
        return false;
      }

      var pendingTasksFromDb = await taskService.getTaskByIds(pendingTasksFromRequest);
      if (pendingTasksFromDb.length != pendingTasksFromRequest.length) {
        res.status(400).json({ message: messages.pending_duplicate, data: { pendingTasks: pendingTasksFromRequest } });
      }

      var invalidIds = [];
      pendingTasksFromDb.forEach((element) => {
        if (element.completed) {
          invalidIds.push(element._id);
        }
      });
      if (invalidIds.length > 0) {
        res.status(400).json({ message: messages.invalid_complete, data: { pendingTasks: invalidIds } });
      }
    }
    return true;
  } catch (error) {
    res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    return false;
  }
};

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

const updateUserIds = async (res, userId, userName, taskIds) => {
  let filter = JSON.parse(
    '{"_id": {"$in": [ ' + '"' + taskIds.join('","') + '"' + "]}}"
  );
  let update = JSON.parse(
    '{"assignedUser": "' + userId + '", "assignedUserName": "' + userName + '"}'
  );
  try {
    await Task.updateMany(filter, update);
    return true;
  } catch (error) {
    res.status(500).json({ message: messages.task_updated_failed, data: 'Internal Server Error' });
    return false;
  }
};

const unsetUserFromTask = async (res, userId) => {
  let update = JSON.parse(
    '{"assignedUser": "' + "" + '", "assignedUserName": "' + "unassigned" + '"}'
  );
  try {
    await Task.updateMany({ assignedUser: userId }, update);
    return true;
  } catch (error) {
    res.status(500).json({ message: messages.task_updated_failed, data: 'Internal Server Error' });
    return false;
  }
};
// Controller methods for the User model
const userController = {
  getUsers: async (req, res) => {
    try {
      const { where, sort, select, skip, limit, count } = req.query;
      let query = User.find();

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
        query = query.limit(100); // Default limit for users
      }

      if (count === 'true') {
        const totalCount = await User.countDocuments(query);
        return res.json({ message: messages.ok, data: totalCount });
      } else {
        const users = await query.exec();
        res.json({ message: messages.ok, data: users });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    }
  },

  createUser: async (req, res) => {
    if (req.body.pendingTasks) {
      var validatePendingTasksStatus = await validatePendingTasks(
        res,
        req.body.pendingTasks
      );
      if (!validatePendingTasksStatus) {
        return;
      }
    }
    const userData = req.body;
    if (!userData.name || !userData.email) {
      return res.status(400).json({ message: messages.name_email_req, data: null });
    }

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      pendingTasks: req.body.pendingTasks
    });

    try {
      if (req.body.pendingTasks && req.body.pendingTasks.length > 0) {
        var deletePendingTasks = await deletePendingTaskValues(
          res,
          null,
          req.body.pendingTasks
        );
        if (!deletePendingTasks) {
          return;
        }
      }
      const existing_user = await User.find(({ "email": req.body.email }))
      if (existing_user.length == 0) {
        const new_user = await user.save();

        if (req.body.pendingTasks && req.body.pendingTasks.length > 0) {
          await updateUserIds(
            res,
            data._id,
            data.name,
            req.body.pendingTasks
          );
        }
        res.status(201).json({ message: messages.user_created, data: new_user })
      }
      else {
        res.status(500).json({ message: messages.user_exists, data: messages.user_exists })
      }
    } catch (err) {
      res.status(500).json({ message: messages.something_wrong, data: err.message })
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: messages.user_notfound, data: 'User not found' });
      }
      res.json({ message: messages.ok, data: user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const id = req.params.id;
      const updatedUserData = req.body;

      if (updatedUserData.pendingTasks) {
        var validatePendingTasksStatus = await validatePendingTasks(
          res,
          updatedUserData.pendingTasks instanceof Array
            ? updatedUserData.pendingTasks
            : [updatedUserData.pendingTasks]
        );
        if (!validatePendingTasksStatus) {
          return;
        }
      }


      if (!updatedUserData.name || !updatedUserData.email) {
        return res.status(400).json({ message: messages.name_email_req, data: null });
      }

      const existingUser = await User.findOne({ email: updatedUserData.email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(409).json({ message: messages.user_exists, data: messages.user_exists })
      }

      if (updatedUserData.pendingTasks && updatedUserData.pendingTasks.length > 0) {
        var deletePendingTaskFromUserStatus =
          await deletePendingTaskValues(
            res,
            id,
            updatedUserData.pendingTasks instanceof Array
              ? updatedUserData.pendingTasks
              : [updatedUserData.pendingTasks]
          );
        if (!deletePendingTaskFromUserStatus) {
          return;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(req.params.id, updatedUserData, {
        new: true,
      });

      if (
        ((updatedUserData.pendingTasks && updatedUserData.pendingTasks.length > 0) ||
          (updatedUserData.name && updatedUserData.name.length > 0)) &&
        updatedUser.pendingTasks.length > 0
      ) {
        var updatedTasksWithUserIdStatus =
          await updateUserIds(
            res,
            updatedUser._id,
            updatedUser.name,
            updatedUser.pendingTasks
          );
        if (!updatedTasksWithUserIdStatus) {
          return;
        }
      }

      if (updatedUserData.pendingTasks && updatedUserData.pendingTasks.length == 0) {
        var unsetUserFromTaskStatus = await unsetUserFromTask(
          res,
          updatedUser._id
        );
        if (!unsetUserFromTaskStatus) {
          return;
        }
      }

      if (!updatedUser) {
        return res.status(404).json({ message: messages.user_notfound, data: 'User not found' });
      }
      res.json({ message: messages.ok, data: updatedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;

      const existingUser = await User.findById(userId);

      if (!existingUser) {
        return res.status(404).json({ message: messages.user_notfound, data: 'User not found' });
      }

      const tasksToUnassignFromUser = existingUser.pendingTasks;

      tasksToUnassignFromUser.forEach(async (taskId) => {
        const task = await Task.findById(taskId);
        if (task) {
          task.assignedUser = null;
          task.assignedUserName = 'unassigned';
          await task.save();
        }
      });

      const deletedUser = await User.findByIdAndRemove(userId);

      res.status(200).json({ message: messages.ok, data: deletedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.something_wrong, data: 'Internal Server Error' });
    }
  }
};

module.exports = userController;
