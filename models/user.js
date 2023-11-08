// Load required packages
var mongoose = require('mongoose');
var ObjectId = require("mongoose").Types.ObjectId;

// Define our user schema
var UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Enter a valid name."],
    },
    email: {
        type: String,
        required: [true, "Enter a valid email."],
        unique: true,
        validate: (input) =>
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(input),
    },
    pendingTasks: [
        { type: ObjectId, validate: (input) => ObjectId.isValid(input) },
    ],
    dateCreated: {
        type: Date,
        default: Date.now
    }
},
    { collection: "users", versionKey: false })

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);