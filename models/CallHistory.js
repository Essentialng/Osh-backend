const { Schema, model } = require("mongoose");

const CallHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    calls: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "users",
        },
        isCaller: {
          type: Boolean,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("callhistory", CallHistorySchema);
