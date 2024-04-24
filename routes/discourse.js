const router = require("express").Router();
const Discourse = require("../models/Discourse");
const Chat = require("../models/Chats");
const Post = require("../models/Post");
const User = require("../models/User");
const Message = require("../models/Message");
const http = require("http");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { accessKeyId, secretAccessKey, region } = require("../config");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "http://10.0.2.2:3000/",
  },
});

aws.config.update({
  secretAccessKey: "",
  accessKeyId: "",
  region: "",
});

socketIO.on("connection", (socket) => {
  console.log(`${socket.id} user is just connected`);
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

/****************************************************************************************************
CREATE DISCOURSE => STARTS
 ***************************************************************************************************/
router.post("/:userId/discourse", userAuth, upload.any(), async (req, res) => {
  const user = req.user;

  const secondUserCred = await User.findById(req.params.userId);

  const userId = user._id.toString();
  const secondUserId = secondUserCred._id.toString();

  user.password = undefined;
  user.role = undefined;
  user.__v = undefined;
  user.followings = undefined;
  user.biography = undefined;
  user.birthday = undefined;
  user.isActive = undefined;
  user.phoneNumber = undefined;
  user.createdAt = undefined;
  user.updatedAt = undefined;
  user.email = undefined;

  try {
    const userChat = await Chat.findOne({ user: userId });
    const secondChat = await Chat.findOne({
      user: secondUserId,
    });

    const userDiscourse = await Discourse.findOne({
      users: { $all: [userId, secondUserId] },
    }).populate({
      path: "messages",
      model: "messages",
      populate: {
        path: "user",
        model: "users",
        select: "_id userName avatar",
      },
    });

    if (userDiscourse) {
      return res.status(201).json({
        message: "Discourse already created",
        data: userDiscourse,
        success: true,
      });
    } else {
      const newDiscourse = new Discourse(req.body);
      newDiscourse.users.push(userId, secondUserId);
      const savedDiscourse = await newDiscourse.save();
      userChat.discourse.push(savedDiscourse);
      secondChat.discourse.push(savedDiscourse);
      await userChat.save();
      await secondChat.save();
      return res.status(201).json({
        message: "Discourse created",
        data: newDiscourse,
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
CREATE DISCOURSE => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
REGISTRATIONS => STARTS
 ***************************************************************************************************/
router.post(
  "/:discourseId/message",
  userAuth,
  upload.any(),
  async (req, res) => {
    const user = req.user;
    const files = req.files;

    const text = req.body.text;
    const replyTo = req.body.replyTo;

    user.password = undefined;
    user.role = undefined;
    user.__v = undefined;
    user.followings = undefined;
    user.biography = undefined;
    user.birthday = undefined;
    user.isActive = undefined;
    user.phoneNumber = undefined;
    user.createdAt = undefined;
    user.updatedAt = undefined;
    user.email = undefined;

    try {
      const discourse = await Discourse.findById(req.params.discourseId);
      const newMessage = new Message(req.body);
      newMessage.text = text;
      newMessage.replyTo = replyTo;
      newMessage.user = user;
      const savedMessage = await newMessage.save();
      console.log("sm", savedMessage);
      discourse.messages.push(savedMessage);
      await discourse.save();
      return res.status(201).json({
        message: "Message sent",
        data: savedMessage,
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        data: err,
        message: "Failed, try again later!",
        success: false,
      });
    }
  }
);

/****************************************************************************************************
GET ALL MESSAGES => STARTS
 ***************************************************************************************************/
router.get("/all/:discourseId", userAuth, async (req, res) => {
  const user = req.user;
  const discourse = await Discourse.findById(req.params.discourseId).populate({
    path: "messages",
    model: "messages",
    populate: {
      path: "user",
      model: "users",
      select: "_id userName avatar",
    },
  });
  const messages = discourse.messages;
  // const renderMessages = messages.reverse();
  const renderMessages = messages;
  try {
    res.status(200).json({
      message: "Messages fetched",
      data: renderMessages,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: [],
      success: false,
    });
  }
});
/****************************************************************************************************
GET ALL MESSAGES => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
GET ALL DISCOURSE => STARTS
 ***************************************************************************************************/
router.get("/all", userAuth, async (req, res) => {
  const user = req.user;
  const chats = await Chat.findOne({ user: user._id }).populate({
    path: "discourse",
    model: "discourse",
    populate: {
      path: "messages",
      model: "messages",
    },
  });

  let renderChats = [];

  for (const chat of chats.discourse) {
    let topicChatUser;
    let users = [];

    for (const user of chat.users) {
      const userDetail = await User.findById(user);
      console.log("user det", userDetail);
      const sterilizedDetail = serializeUser(userDetail);
      users.push(sterilizedDetail);
    }

    const userOne = {
      _id: users[0]._id,
      name: users[0].name,
      userName: users[0].username,
      avatar: users[0].avatar,
    };

    const userTwo = {
      _id: users[1]._id,
      name: users[1].name,
      userName: users[1].username,
      avatar: users[1].avatar,
    };

    if (user._id.toString() == userOne._id.toString()) {
      topicChatUser = userTwo;
    } else {
      topicChatUser = userOne;
    }

    let lastMessage;

    chat.messages.length > 0
      ? (lastMessage = chat.messages[chat.messages.length - 1])
      : (lastMessage = { text: "Start a conversation" });
    renderChats.push({ _id: chat._id, topicChatUser, lastMessage });
  }

  // console.log("chat", renderChats);
  try {
    res.status(200).json({
      message: "Discourse fetched",
      data: renderChats,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: [],
      success: false,
    });
  }
});
/****************************************************************************************************
GET ALL DISCOURSE => ENDS
 ***************************************************************************************************/

module.exports = router;
