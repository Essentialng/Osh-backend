const { Schema, model } = require("mongoose");

const StatusSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },

    files: [
      {
        type: Schema.Types.ObjectId,
        ref: "statusContent",
      },
    ],
    clicks: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("status", StatusSchema);
