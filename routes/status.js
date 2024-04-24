const router = require("express").Router();
const Status = require("../models/Status");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Content = require("../models/Content");
const StatusTimeline = require("../models/StatusTimeline");

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
const StatusContent = require("../models/StatusContent");

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
  const bgColor = req.body.bgColor;
  console.log("color", bgColor);
  const caption = req.body.caption;
  console.log("caption", caption);
  const activeUser = await User.findById(user._id);
  const userStatusTimeline = await StatusTimeline.findOne({ user: user._id });
  const userFollowers = activeUser.followers;
  let followerStatusTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;

  try {
    const newStatusContent = new StatusContent(req.body);
    newStatusContent.user = user;
    newStatusContent.media.text = files[0]?.location || "";
    newStatusContent.media.backgroundColor = bgColor;
    newStatusContent.media.caption = caption;
    console.log("new status content", newStatusContent);
    const savedStatusContent = await newStatusContent.save();
    console.log("saved status content", savedStatusContent);
    const userStatus = await Status.findOne({ user: user._id });
    console.log("user status", userStatus);
    if (userStatus) {
      userStatus.files.push(savedStatusContent);
      const updatedUserStatus = await userStatus.save();
      // for (const x of userFollowers) {
      //   followerStatusTimeline = await StatusTimeline.findOne({
      //     user: x,
      //   }).exec();
      //   const exists = followerStatusTimeline.some(
      //     (obj) => obj._id === userStatus._id
      //   );

      //   console.log("ext", exists);

      // if (!exists) {
      //   followerStatusTimeline.status.push(updatedUserStatus);
      //   await followerStatusTimeline.save();
      // }
      //   console.log("follower status timeline,", followerStatusTimeline);
      // }
      res.status(200).json({
        message: "Status created",
        data: updatedUserStatus,
        success: true,
      });
    } else {
      const newStatus = new Status();
      newStatus.user = user;
      newStatus.files.push(savedStatusContent);
      const savedStatus = await newStatus.save();
      console.log("saved status", savedStatus);
      userStatusTimeline.status.push(savedStatus);
      userStatusTimeline.save();
      for (const x of userFollowers) {
        followerStatusTimeline = await StatusTimeline.findOne({
          user: x,
        }).exec();
        console.log("follower status timeline,", followerStatusTimeline);
        followerStatusTimeline.status.push(savedStatus);
        await followerStatusTimeline.save();
      }
      res.status(200).json({
        message: "Status created",
        data: savedStatus,
        success: true,
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
 GET A STATUS => START
 *****************************************************************************************************/
router.get("/:userId", userAuth, async (req, res) => {
  const userId = req.user._id.toString();
  const status = await Status.findOne({ user: req.params.userId }).populate({
    path: "files",
    model: "statusContent",
  });
  console.log("status", status.files);
  try {
    res.status(200).json({
      message: "Status fetched",
      data: status,
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
 GET A STATUS => END
 *****************************************************************************************************/

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
 GET REEL TIMELINE FOR A USER => START
 *****************************************************************************************************/
router.get("/timeline/all", userAuth, async (req, res) => {
  const userId = req.user._id.toString();

  const status = await StatusTimeline.findOne({ user: userId }).populate({
    path: "status",
    model: "status",
    populate: {
      path: "user",
      model: "users",
      select: "_id userName name avatar createdAt",
    },
    populate: {
      path: "files",
      model: "statusContent",
      populate: {
        path: "user",
        model: "users",
        select: "_id userName name avatar createdAt",
      },
    },
  });

  let statusTimeline = status.status.reverse();

  try {
    res.status(200).json({
      message: "",
      data: statusTimeline,
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
