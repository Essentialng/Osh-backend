const router = require("express").Router();
const Reel = require("../models/Reel");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Content = require("../models/Content");
const ReelTimeline = require("../models/ReelTimeline");

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
  const description = req.body.description;
  const activeUser = await User.findById(user._id);
  const allUsers = await User.find({ role: "user" });
  console.log("all users", allUsers);
  const userFollowers = activeUser.followers;
  const userReelTimeline = await ReelTimeline.findOne({ user: user._id });
  let followerReelTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;

  try {
    const newReel = new Reel(req.body);
    newReel.user = user;
    newReel.video = files[0].location;
    newReel.description = description;
    const savedReel = await newReel.save();
    userReelTimeline.posts.push(savedReel);
    userReelTimeline.save();
    for (const x of allUsers) {
      console.log("reel x", x);
      followerReelTimeline = await ReelTimeline.findOne({ user: x._id }).exec();
      followerReelTimeline.posts.push(savedReel);
      await followerReelTimeline.save();
      const newNotify = new Notify();
      newNotify.sender = user._id;
      newNotify.receiver = x;
      newNotify.postId = savedPost._id;
      newNotify.caption = `${user.userName} just made a new reel`;
      const savedNotify = await newNotify.save();
      followerNotification = await Notification.findOne({
        user: x,
      }).exec();
      console.log("followerNotification", followerNotification);
      followerNotification.notify.push(savedNotify);
      await followerNotification.save();
    }
    // for (const x of userFollowers) {
    //   followerReelTimeline = await ReelTimeline.findOne({ user: x }).exec();
    //   followerReelTimeline.posts.push(savedReel);
    //   await followerReelTimeline.save();
    //   const newNotify = new Notify();
    //   newNotify.sender = user._id;
    //   newNotify.receiver = x;
    //   newNotify.postId = savedPost._id;
    //   newNotify.caption = `${user.userName} just made a new reel`;
    //   const savedNotify = await newNotify.save();
    //   followerNotification = await Notification.findOne({
    //     user: x,
    //   }).exec();
    //   console.log("followerNotification", followerNotification);
    //   followerNotification.notify.push(savedNotify);
    //   await followerNotification.save();
    // }
    res.status(200).json({
      message: "Reel created",
      data: savedReel,
      success: true,
    });
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
  const commentText = req.body.commentText;
  const activeUser = await User.findById(user._id);
  const currentReel = await Reel.findById(req.params.id);
  let followerTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;
  try {
    const newComment = new Comment(req.body);
    newComment.user = user;
    const content = new Content(req.body);
    content.text = commentText;
    files.forEach((file) => {
      if (file.fieldname === "commentFiles") {
        content.files.push(file.location);
      }
    });
    const savedContent = await content.save();
    newComment.text = savedContent;
    const savedComment = await newComment.save();
    currentReel.comments.push(savedComment);
    await currentReel.save();

    res.status(200).json({
      message: "Comment created",
      data: savedComment,
      success: true,
    });
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
  const reel = await Reel.findById(req.params.id).populate(
    "user",
    "_id userName name avatar createdAt"
  );
  // console.log("reel", reel);
  const user = req.user._id;
  try {
    if (reel.likes.includes(user)) {
      const reel = await Reel.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { likes: req.user._id },
        },
        { new: true }
      ).populate("user", "_id userName name avatar createdAt");
      res.status(200).json({
        message: "Reel unliked",
        data: reel,
        success: true,
      });
    } else {
      const reel = await Reel.findByIdAndUpdate(
        req.params.id,
        {
          $push: { likes: req.user._id },
        },
        { new: true }
      ).populate("user", "_id userName name avatar createdAt");
      res.status(200).json({
        message: "Reel liked",
        data: reel,
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
GET PYRAMID POST COMMENTS => STARTS
***************************************************************************************************/
router.get("/:id/comments", userAuth, async (req, res) => {
  const reel = await Reel.findById(req.params.id)
    .populate({
      path: "comments",
      model: "comment",
      populate: {
        path: "user",
        model: "users",
        select: "_id userName name avatar",
      },
    })
    .populate({
      path: "comments",
      model: "comment",
      populate: {
        path: "text",
        model: "content",
      },
    });
  const comments = reel.comments.reverse();
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
 GET REEL TIMELINE FOR A USER => START
 *****************************************************************************************************/
router.get("/timeline/all", userAuth, async (req, res) => {
  const userId = req.user._id.toString();

  const reel = await ReelTimeline.findOne({ user: userId }).populate({
    path: "posts",
    model: "reel",
    populate: {
      path: "user",
      model: "users",
      select: "_id userName name avatar createdAt",
    },
    populate: {
      path: "comments",
      model: "comment",
      populate: {
        path: "text",
        model: "content",
        populate: {
          path: "user",
          model: "users",
          select: "_id userName name avatar createdAt",
        },
      },
    },
  });

  let timelineReel = reel.posts.reverse();

  const { page, limit } = req.query;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};
  if (endIndex < timelineReel) {
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

  results.results = timelineReel.slice(startIndex, endIndex);

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
 GET REEL TIMELINE FOR A USER => ENDS
 ****************************************************************************************************/

module.exports = router;
