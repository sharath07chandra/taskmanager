let mongoose = require('mongoose');
var ObjectId = require("mongoose").Types.ObjectId;

var TaskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Enter a valid task name."],
    },
    description: {
        type: String,
        required: false,
        default: ""
    },
    deadline: {
        type: Date,
        required: [true, "Enter a valid deadline."],
        validate: (input) => input.getTime() && new Date(input) >= new Date(),
    },
    completed: {
        type: Boolean,
        required: true
    },
    assignedUser: {
        type: String,
        required: false,
        default: "",
        validate: (input) => (input ? ObjectId.isValid(input) : true),
    },
    assignedUserName: {
        type: String,
        required: false,
        default: "unassigned"
    },
    dateCreated: {
        type: Date,
        required: false,
        default: Date.now
    }
},
    { collection: "tasks", versionKey: false })

module.exports = mongoose.model('Task', TaskSchema)