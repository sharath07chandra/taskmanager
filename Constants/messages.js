const messages = {
    something_wrong: "Something went wrong. Please try again later.",
    ok: "Success! OK!",
    user_created: "User created",
    user_exists: "User already exists",
    user_notfound: "User you are searching for is not found.",
    task_created: "Task created",
    task_exists: "Task already exists",
    task_notfound: "Task you are searching for is not found.",
    invalid_pending_task: "Invalid values provided for pendingTask",
    pending_duplicate: "The pending task array contains invalid/duplicate values. Please check if the task exists.",
    invalid_complete: "Completed tasks cannot be assigned to a user.",
    user_updated_failed: "Failed to update users. Try again later.",
    task_updated_failed: "Failed to update tasks. Try again later.",
    name_required: "Name and deadline are required.",
    name_email_req: "Name and email are required.",
    invalid_userid: "Please provide a valid value for userAssigned.",
    invalid_data: "Invalid data provided. Check all values."
}

module.exports = messages;