const { Schema, model } = require("mongoose");

const GroupSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    facet: {
      type: Schema.Types.ObjectId,
      ref: "facets",
      // required: true,
    },
    members: {
      type: Array,
      default: [],
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("group", GroupSchema);
