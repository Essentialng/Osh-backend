const { Schema, model } = require("mongoose");

const CallSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    isCaller: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = model("call", CallSchema);
