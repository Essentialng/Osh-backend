const { Schema, model } = require("mongoose");

const NotificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    notify: [{
        type: Schema.Types.ObjectId,
        ref: 'notify'
    }]
}, { timestamps: true });

module.exports = model('notification', NotificationSchema)