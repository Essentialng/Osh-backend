const { Schema, model } = require("mongoose");

const TimelineSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'post'
    }]
}, { timestamps: true });

module.exports = model('timeline', TimelineSchema)