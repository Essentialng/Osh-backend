const router = require("express").Router();
const Post = require("../models/Post");
const Content = require("../models/Content");
const User = require("../models/User");
const Timeline = require("../models/Timeline");
const CallHistory = require("../models/CallHistory");
const Call = require("../models/Call");

// Bring in the User Registration function
const { userAuth, serializeUser } = require("../utils/Auth");

/****************************************************************************************************
CREATING PYRAMID POST => STARTS
****************************************************************************************************/

//create a post
router.post("/", userAuth, async (req, res) => {
  const user = req.user;
  const userCallHistory = await CallHistory.findOne({ user: user._id });
  try {
    newPost.user = user;
    const savedPost = {};
    userCallHistory.calls.push(savedPost);
    userCallHistory.save();
  } catch (err) {
    res.status(500).json({
      data: err,
      message: "Failed, try again later!",
      success: false,
    });
  }
});

/****************************************************************************************************
CREATING PYRAMID POST => ENDS
****************************************************************************************************/

module.exports = router;
