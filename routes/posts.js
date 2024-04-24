const router = require("express").Router();
const Post = require("../models/Post");
const Content = require("../models/Content");
const User = require("../models/User");
const Timeline = require("../models/Timeline");
const Channel = require("../models/Group");
const Notify = require("../models/Notify");
const Notification = require("../models/Notification");
const SuggestedChannels = require("../models/SuggestedChannel");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { accessKeyId, secretAccessKey, region } = require("../config");

aws.config.update({
  secretAccessKey: "",
  accessKeyId: "",
  region: "",
});

const BUCKET = process.env.BUCKET;

const s3 = new aws.S3();

const upload = multer({
  storage: multerS3({
    bucket: BUCKET,
    s3: s3,
    // acl: "public-read",
    key: (req, file, cb) => {
      cb(null, Date.now() + file.originalname);
    },
  }),
});

// Bring in the User Registration function
const { userAuth, serializeUser } = require("../utils/Auth");

/****************************************************************************************************
CREATING PYRAMID POST => STARTS
****************************************************************************************************/
router.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file);

  res.send("Successfully uploaded " + req.file.location + " location!");
});

router.get("/list", async (req, res) => {
  let r = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
  console.log(r);
  let x = r.Contents.map((item) => item.Key);
  res.send(x);
});

router.get("/download/:filename", async (req, res) => {
  const filename = req.params.filename;
  let x = await s3.getObject({ Bucket: BUCKET, Key: filename }).promise();

  res.send(x.Body);
});

router.delete("/delete/:filename", async (req, res) => {
  const filename = req.params.filename;
  await s3.deleteObject({ Bucket: BUCKET, Key: filename }).promise();
  res.send("File Deleted Successfully");
});

//create a post
router.post("/", userAuth, upload.any(), async (req, res) => {
  const user = req.user;
  const files = req.files;
  const keyMessageText = req.body.keyMessageText;
  const activeUser = await User.findById(user._id);
  const userTimeline = await Timeline.findOne({ user: user._id });
  const allUsers = await User.find({ role: "user" });
  const userFollowers = activeUser.followers;
  let followerTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;
  try {
    const newPost = new Post(req.body);
    newPost.user = user;
    const content = new Content(req.body);
    content.text = keyMessageText;
    files.forEach((file) => {
      if (file.fieldname === "keyMessageFiles") {
        content.files.push(file.location);
      }
    });
    if (content.text !== undefined || content.files.length !== 0) {
      const savedContent = await content.save();
      newPost.text = savedContent;
      const savedPost = await newPost.save();
      userTimeline.posts.push(savedPost);
      userTimeline.save();
      // for (const x of userFollowers) {
      //   followerTimeline = await Timeline.findOne({ user: x }).exec();
      //   followerTimeline.posts.push(savedPost);
      //   await followerTimeline.save();
      //   const newNotify = new Notify();
      //   newNotify.sender = user._id;
      //   newNotify.receiver = x;
      //   newNotify.postId = savedPost._id;
      //   newNotify.caption = `${user.userName} just made a new post`;
      //   const savedNotify = await newNotify.save();
      //   followerNotification = await Notification.findOne({
      //     user: x,
      //   }).exec();
      //   console.log("followerNotification", followerNotification);
      //   followerNotification.notify.push(savedNotify);
      //   await followerNotification.save();
      // }
      for (const x of allUsers) {
        console.log("post x", x);
        followerTimeline = await Timeline.findOne({ user: x._id }).exec();
        followerTimeline.posts.push(savedPost);
        await followerTimeline.save();
        console.log("all users timeline", followerTimeline);
        const newNotify = new Notify();
        newNotify.sender = user._id;
        newNotify.receiver = x;
        newNotify.postId = savedPost._id;
        newNotify.caption = `${user.userName} just made a new post`;
        const savedNotify = await newNotify.save();
        followerNotification = await Notification.findOne({
          user: x,
        }).exec();
        console.log("followerNotification", followerNotification);
        followerNotification.notify.push(savedNotify);
        await followerNotification.save();
      }
      res.status(200).json({
        message: "Post created",
        data: savedPost,
        success: true,
      });
    } else {
      res.status(500).json({
        data: "",
        message: "can't save empty data",
        success: false,
      });
    }
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

/****************************************************************************************************
CREATING PYRAMID COMMENT => STARTS
 ***************************************************************************************************/
//create a comment
router.patch("/:id/comment", userAuth, upload.any(), async (req, res) => {
  const user = req.user;
  const files = req.files;
  const keyMessageText = req.body.keyMessageText;
  const activeUser = await User.findById(user._id);
  const currentPost = await Post.findById(req.params.id);
  const userTimeline = await Timeline.findOne({ user: user._id });
  const activeUserFollowers = activeUser.followers;
  const allUsers = await User.find({ role: "user" });
  let followerTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;
  try {
    const newPost = new Post(req.body);
    newPost.user = user;
    const content = new Content(req.body);
    content.text = keyMessageText;
    files.forEach((file) => {
      if (file.fieldname === "keyMessageFiles") {
        keyMessage.files.push(file.location);
      }
    });
    if (content.text !== undefined || content.files.length !== 0) {
      const savedContent = await content.save();
      newPost.text = savedContent;
      const savedPost = await newPost.save();
      if (currentPost) {
        currentPost.comments.push(savedPost);
        await currentPost.save();
      }
      // for (const x of allUsers) {
      //   console.log("post x", x);
      //   followerTimeline = await Timeline.findOne({ user: x._id }).exec();
      //   followerTimeline.posts.push(savedPost);
      //   await followerTimeline.save();
      //   console.log("all users timeline", followerTimeline);
      //   const newNotify = new Notify();
      //   newNotify.sender = user._id;
      //   newNotify.receiver = x;
      //   newNotify.postId = savedPost._id;
      //   newNotify.caption = `${user.userName} just made a new post`;
      //   const savedNotify = await newNotify.save();
      //   followerNotification = await Notification.findOne({
      //     user: x,
      //   }).exec();
      //   console.log("followerNotification", followerNotification);
      //   followerNotification.notify.push(savedNotify);
      //   await followerNotification.save();
      // }
      // for (const x of activeUserFollowers) {
      //   followerTimeline = await Timeline.findOne({ user: x }).exec();
      //   followerTimeline.posts.push(savedPost);
      //   await followerTimeline.save();
      //   const newNotify = new Notify();
      //   newNotify.sender = user._id;
      //   newNotify.receiver = x;
      //   newNotify.postId = savedPost._id;
      //   newNotify.caption = `${user.userName} just made a new post`;
      //   const savedNotify = await newNotify.save();
      //   followerNotification = await Notification.findOne({
      //     user: x,
      //   }).exec();
      //   console.log("followerNotification", followerNotification);
      //   followerNotification.notify.push(savedNotify);
      //   await followerNotification.save();
      // }
      res.status(200).json({
        message: "Comment created",
        data: savedPost,
        success: true,
      });
    } else {
      res.status(500).json({
        data: "",
        message: "can't save empty data",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json({
      data: err,
      message: "Failed, try again later!",
      success: false,
    });
  }
});
/****************************************************************************************************
CREATING PYRAMID COMMENT => ENDS
***************************************************************************************************/

/****************************************************************************************************
DELETE A PYRAMID POST => STARTS
***************************************************************************************************/
router.delete("/:id", userAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  const keyMessage = post.text;

  let allContents = [keyMessage];

  const user = req.user._id.toString();
  console.log("user post", post.user, "auth user", user);

  try {
    if (post.user.toString() === user) {
      for (const content of allContents) {
        if (content !== "" || content !== undefined) {
          Content.findByIdAndDelete(content, function (err, docs) {
            if (err) {
              console.log(err);
            } else {
              console.log("Deleted: ", docs);
            }
          });
        }
      }

      Post.findByIdAndDelete(post._id.toString(), function (err, docs) {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json("the post has been deleted");
        }
      });
    } else {
      res.status(403).json("you can delete only your post");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
DELETE A PYRAMID POST => ENDS
***************************************************************************************************/

/****************************************************************************************************
LIKE A PYRAMID POST => STARTS
***************************************************************************************************/
router.put("/:id/like", userAuth, async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("user", "_id userName name avatar createdAt")
    .populate("text");
  const user = req.user._id;
  try {
    if (post.likes.includes(user)) {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { likes: req.user._id },
        },
        { new: true }
      )
        .populate("user", "_id userName name avatar createdAt")
        .populate("text");
      res.status(200).json({
        message: "Post unliked",
        data: post,
        success: true,
      });
    } else {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $push: { likes: req.user._id },
        },
        { new: true }
      )
        .populate("user", "_id userName name avatar createdAt")
        .populate("text");
      res.status(200).json({
        message: "Post liked",
        data: post,
        success: true,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err,
      data: err,
      success: false,
    });
  }
});
/****************************************************************************************************
LIKE A PYRAMID POST => ENDS
***************************************************************************************************/

/****************************************************************************************************
STAR A PYRAMID POST => START
***************************************************************************************************/
router.put("/:id/star", userAuth, async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("user", "_id userName name avatar")
    .populate("keyMessage");
  const user = req.user._id;
  try {
    if (post.saved.includes(user)) {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { saved: req.user._id },
        },
        { new: true }
      )
        .populate("user", "_id userName name avatar")
        .populate(
          "keyMessage firstArgument secondArgument thirdArgument firstArgumentEvidentOne firstArgumentEvidentTwo firstArgumentEvidentThree secondArgumentEvidentOne secondArgumentEvidentTwo secondArgumentEvidentThree thirdArgumentEvidentOne thirdArgumentEvidentTwo thirdArgumentEvidentThree channel"
        );
      res.status(200).json({
        message: "unstarred successfully",
        data: post,
        success: true,
      });
    } else {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $push: { saved: req.user._id },
        },
        { new: true }
      )
        .populate("user", "_id userName name avatar")
        .populate(
          "keyMessage firstArgument secondArgument thirdArgument firstArgumentEvidentOne firstArgumentEvidentTwo firstArgumentEvidentThree secondArgumentEvidentOne secondArgumentEvidentTwo secondArgumentEvidentThree thirdArgumentEvidentOne thirdArgumentEvidentTwo thirdArgumentEvidentThree channel"
        );
      res.status(200).json({
        message: "starred successfully",
        data: post,
        success: true,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err,
      data: err,
      success: false,
    });
  }
});
/****************************************************************************************************
STAR A PYRAMID POST => ENDS
***************************************************************************************************/

/****************************************************************************************************
GET A PYRAMID POST => START
***************************************************************************************************/
router.get("/:id", userAuth, async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("user", "_id name userName avatar createdAt")
    .populate("text");

  const user = req.user._id.toString();
  if (!post.clicks.includes(user)) {
    post.clicks.push(user);
  }
  try {
    res.status(200).json({
      message: "Post fetched",
      data: post,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: err,
      success: false,
    });
  }
});
/****************************************************************************************************
GET A PYRAMID POST => ENDS
***************************************************************************************************/

/****************************************************************************************************
GET PYRAMID POST COMMENTS => STARTS
***************************************************************************************************/
router.get("/:id/comments", userAuth, async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate({
      path: "comments",
      model: "post",
      populate: {
        path: "user",
        model: "users",
        select: "_id userName name avatar",
      },
    })
    .populate({
      path: "comments",
      model: "post",
      populate: {
        path: "text",
        model: "content",
      },
    });
  const comments = post.comments.reverse();
  try {
    res.status(200).json({
      message: "",
      data: comments,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: err,
      success: false,
    });
  }
});
/****************************************************************************************************
GET PYRAMID POST COMMENTS => ENDS
***************************************************************************************************/

/****************************************************************************************************
GET PYRAMID POST FOR A USER => START
***************************************************************************************************/
router.get("/:userId/posts", userAuth, async (req, res) => {
  const user = req.user;
  const userPosts = await Post.find({ user: req.params.userId })
    .populate({
      path: "user",
      model: "users",
      select: "_id userName name avatar createdAt",
    })
    .populate("text");
  const allUsersPost = userPosts.reverse();

  let timelinePost = allUsersPost;

  const { page, limit } = req.query;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};
  if (endIndex < timelinePost) {
    results.next = {
      page: page + 1,
      limit: limit,
    };
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit,
    };
  }

  results.results = timelinePost.slice(startIndex, endIndex);

  try {
    res.json({
      message: "",
      data: results,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: "",
      success: false,
    });
  }
});
/****************************************************************************************************
GET PYRAMID POST FOR A USER => ENDS
****************************************************************************************************/

/****************************************************************************************************
GET PYRAMID POST FOR A USER FOR A CHANNEL => START
****************************************************************************************************/
router.get("/:channelId/channel", userAuth, async (req, res) => {
  const user = req.user;
  const userPosts = await Post.find({ channel: req.params.channelId })
    .populate({
      path: "user",
      model: "users",
      select: "_id userName name avatar",
    })
    .populate(
      "keyMessage firstArgument secondArgument thirdArgument firstArgumentEvidentOne firstArgumentEvidentTwo firstArgumentEvidentThree secondArgumentEvidentOne secondArgumentEvidentTwo secondArgumentEvidentThree thirdArgumentEvidentOne thirdArgumentEvidentTwo thirdArgumentEvidentThree channel"
    );
  const allUsersPost = userPosts.reverse();
  try {
    res.json(allUsersPost);
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET PYRAMID POST FOR A USER FOR A CHANNEL => ENDS
*****************************************************************************************************/

/****************************************************************************************************
GET TIMELINE FOR A USER => START
*****************************************************************************************************/
router.get("/timeline/all", userAuth, async (req, res) => {
  const userId = req.user._id.toString();

  const timeline = await Timeline.findOne({ user: userId })
    .populate({
      path: "posts",
      model: "post",
      populate: {
        path: "user",
        model: "users",
        select: "_id userName name avatar createdAt",
      },
    })
    .populate({
      path: "posts",
      model: "post",
      populate: { path: "text", model: "content" },
    });

  let timelinePost = timeline.posts.reverse();

  const { page, limit } = req.query;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};
  if (endIndex < timelinePost) {
    results.next = {
      page: page + 1,
      limit: limit,
    };
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit,
    };
  }

  results.results = timelinePost.slice(startIndex, endIndex);

  try {
    res.status(200).json({
      message: "",
      data: results,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: "",
      success: false,
    });
  }
});
/****************************************************************************************************
GET TIMELINE FOR A USER => ENDS
****************************************************************************************************/

/****************************************************************************************************
GET STARRED => START
*****************************************************************************************************/
router.get("/starred/all", userAuth, async (req, res) => {
  const userId = req.user._id.toString();
  const timeline = await Post.find({ saved: userId })
    .populate({
      path: "user",
      model: "users",
      select: "_id userName name avatar",
    })
    .populate(
      "keyMessage firstArgument secondArgument thirdArgument firstArgumentEvidentOne firstArgumentEvidentTwo firstArgumentEvidentThree secondArgumentEvidentOne secondArgumentEvidentTwo secondArgumentEvidentThree thirdArgumentEvidentOne thirdArgumentEvidentTwo thirdArgumentEvidentThree channel"
    );

  const postTimeline = timeline.reverse();
  try {
    res.status(200).json({
      message: "",
      data: postTimeline,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: "",
      success: false,
    });
  }
});
/****************************************************************************************************
GET STARRED => ENDS
****************************************************************************************************/

/****************************************************************************************************
DELETE A TIMELINE POST => STARTS
***************************************************************************************************/
router.delete("/timeline/delete/:postId", userAuth, async (req, res) => {
  const user = req.user._id.toString();
  const userTimeline = await Timeline.findOne({ user });
  const timelineId = userTimeline._id.toString();
  const timeline = await Timeline.findByIdAndUpdate(
    timelineId,
    {
      $pull: { posts: req.params.postId },
    },
    { new: true }
  );

  const postTimeline = timeline.posts.reverse();

  try {
    res.status(200).json({
      message: "post deleted from timeline",
      data: req.params.postId,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: "",
      success: false,
    });
  }
});
/****************************************************************************************************
DELETE A TIMELINE POST => ENDS
***************************************************************************************************/

module.exports = router;
