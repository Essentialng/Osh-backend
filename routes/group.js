const router = require("express").Router();
const User = require("../models/User");
const Timeline = require("../models/Timeline");
const Content = require("../models/Content");
const Post = require("../models/Post");
const Facet = require("../models/Facet");
const Group = require("../models/Group");
const SuggestedChannel = require("../models/SuggestedChannel");

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
const { userAuth, serializeUser, checkRole } = require("../utils/Auth");

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

/****************************************************************************************************
REGISTRATIONS => STARTS
 ***************************************************************************************************/
// channel Registeration Route
router.post("/", userAuth, upload.any(), async (req, res) => {
  const user = req.user;
  const files = req.files;
  console.log("files", files);
  try {
    const newGroup = new Group();
    newGroup.user = req.user._id;
    newGroup.name = req.body.name;
    newGroup.description = req.body.description;
    newGroup.avatar = files[0].location;

    console.log("new group", newGroup);

    await newGroup.save();
    return res.status(201).json({
      message: "Hurry! now you have successfully created a group.",
      data: newGroup,
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to create new group.",
      success: false,
    });
  }
});

/****************************************************************************************************
    REGISTRATIONS => ENDS
     ***************************************************************************************************/

/****************************************************************************************************
GET A CHANNEL => START
****************************************************************************************************/
router.get("/:group", userAuth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.group });
    if (!group) {
      return res.status(404).json({
        message: "Group not found",
        success: false,
        data: "",
      });
    }
    return res.json({
      message: "group found",
      data: group,
      success: true,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET A CHANNEL => ENDS
****************************************************************************************************/

/****************************************************************************************************
GET A USER CHANNEL => START
****************************************************************************************************/
router.get("/", userAuth, async (req, res) => {
  const user = req.user._id.toString();
  try {
    const group = await Group.find({ user: user });
    if (!group) {
      return res.status(404).json({
        message: "No group found",
        data: [],
        success: false,
      });
    }
    return res.json({
      message: "group found",
      data: group,
      success: true,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET A USER CHANNEL => ENDS
****************************************************************************************************/

/****************************************************************************************************
GET ALL CHANNELS => START
****************************************************************************************************/
router.get("/all/groups", userAuth, async (req, res) => {
  // router.get("/all/groups", userAuth, checkRole(["admin"]), async (req, res) => {
  const group = await Group.find();
  try {
    res
      .status(200)
      .json({ message: "Groups found", data: group, success: true });
  } catch (err) {
    res.status(500).json({ message: err, data: err, success: false });
  }
});
/****************************************************************************************************
GET ALL CHANNELS => ENDS
****************************************************************************************************/

/****************************************************************************************************
UPDATE CHANNEL => START
****************************************************************************************************/
router.put("/:group", userAuth, async (req, res) => {
  const user = req.user.userName;
  const group = await Group.findOne({ _id: req.params.group });
  try {
    if (user === group.user) {
      await group.updateOne({ $set: req.body }, { runValidators: true });
      const updatedGroup = await Group.findOne({
        _id: req.params._id,
      });
      return res.status(200).json({
        message: "Group updated successfully",
        data: updatedGroup,
        success: true,
      });
    } else {
      return res.status(403).json({
        message: "You can update only the group you created!",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
UPDATE CHANNEL => ENDS
****************************************************************************************************/

/****************************************************************************************************
FOLLOW USER CHANNEL => START
****************************************************************************************************/
router.put("/:group/follow", userAuth, async (req, res) => {
  const group = await Group.findOne({ _id: req.params.group });
  const authUserId = req.user._id.toString();
  const authUser = await User.findOne({ _id: authUserId });
  const authUserName = req.user.userName.toString();
  if (!group) {
    res.status(200).json("group not found");
  } else {
    const groupMembers = group.members;
    const groupId = group._id.toString();
    try {
      if (!groupMembers.includes(authUserId)) {
        await group.updateOne({
          $push: { members: authUserId },
        });
        const updatedGroup = await Group.findOne({ _id: req.params.group });
        await authUser.updateOne({ $push: { followedGroups: groupId } });
        res.status(200).json({
          message: "You are now a member of this group",
          data: updatedGroup,
          success: true,
        });
      } else {
        await group.updateOne({
          $pull: { members: authUserId },
        });
        await authUser.updateOne({ $pull: { followedGroups: groupId } });
        const updatedGroup = await Group.findOne({ _id: req.params.group });
        res.status(200).json({
          message: "You are no more a member of this group",
          data: updatedGroup,
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
  }
});
/****************************************************************************************************
FOLLOW USER CHANNEL => ENDS
****************************************************************************************************/
router.get("/all/suggestedchannels", userAuth, async (req, res) => {
  const user = await User.find({ role: "user" });
  try {
    var result = user.map((eachUser) => serializeUser(eachUser));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
SUGGESTED CHANNELS => ENDS
****************************************************************************************************/
/****************************************************************************************************
 CREATE GROUP POST => STARTS
 ****************************************************************************************************/

router.post("/:groupId", userAuth, upload.any(), async (req, res) => {
  const user = req.user;
  const files = req.files;
  const keyMessageText = req.body.keyMessageText;
  const activeUser = await User.findById(user._id);
  const userTimeline = await Timeline.findOne({ user: user._id });
  let followerTimeline = "";
  let followerNotification = "";
  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;
  try {
    const newPost = new Post(req.body);
    newPost.user = user;
    newPost.group = req.params.groupId;
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
      userTimeline.posts.push(savedPost);
      userTimeline.save();
      // for (const x of userChannelFollowers) {
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
 CREATE GROUP POST => ENS
 ****************************************************************************************************/

module.exports = router;
