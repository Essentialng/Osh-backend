const { Schema, model } = require("mongoose");

const DiscourseSchema = new Schema(
  {
    users: [String],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "messages",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("discourse", DiscourseSchema);
