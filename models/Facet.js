const { Schema, model } = require("mongoose");

const FacetSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    subscribers: {
      type: Array,
      default: [],
    },
    description: {
      type: String,
      required: true,
    },
    facetIcon: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = model("facets", FacetSchema);
