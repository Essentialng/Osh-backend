const { Schema, model } = require("mongoose");

const NotifySchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'post'
    },
    caption: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['user-user', 'admin-user', 'facet-user'],
        default: "user-user",
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = model('notify', NotifySchema)