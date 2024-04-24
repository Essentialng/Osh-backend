const router = require("express").Router();
const User = require("../models/User");
const Facet = require("../models/Facet");
const Channel = require("../models/Group");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const {
  accessKeyId,
  secretAccessKey,
  region,
  emailAddress,
  emailPassword,
} = require("../config");
const transporter = require("../utils/emailConfig");

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
const {
  serializeUser,
  checkRole,
  userRegister,
  userLogin,
  userAuth,
} = require("../utils/Auth");

/***************************************************************************************************
REGISTRATIONS => STARTS
 ***************************************************************************************************/
// Users Registeration Route
router.post("/register-user", upload.single("file"), async (req, res) => {
  const avatar = req.file;
  console.log("registeration", req.file);
  await userRegister(req.body, avatar?.location, "user", res);
});

router.get("/list", async (req, res) => {
  let r = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
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
  let x = await s3.deleteObject({ Bucket: BUCKET, Key: filename }).promise();
  res.send("File deleted successfully");
});

// Admins Registeration Route
router.post("/register-admin", upload.single("file"), async (req, res) => {
  const avatar = req.file;
  await userRegister(req.body, avatar?.location, "admin", res);
});

/***************************************************************************************************
REGISTRATIONS => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
LOGIN => START
 ***************************************************************************************************/
// Users Login Route
router.post("/login-user", async (req, res) => {
  await userLogin(req.body, "user", res);
});

// Admin Login Route
router.post("/login-admin", async (req, res) => {
  await userLogin(req.body, "admin", res);
});
/****************************************************************************************************
LOGIN => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
VERIFY => STARTS
 ***************************************************************************************************/
router.patch("/verify", async (req, res) => {
  const user = await User.findOne({
    verificationCode: req.body.verificationCode,
  });

  if (user == null) {
    return res.status(404).json({
      message: "Verification code not valid",
      data: "",
      success: false,
    });
  } else {
    user.isVerified = true;

    function generateRandomNumbers() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const verificationCode = generateRandomNumbers();
    user.verificationCode = verificationCode;

    const savedUser = await user.save();

    console.log("saved user", savedUser);

    return res.status(200).json({
      message: "User successfully verified",
      data: savedUser,
      success: true,
    });
  }
});
/****************************************************************************************************
VERIFY => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
VERIFY => STARTS
 ***************************************************************************************************/
router.post("/resendVerify", async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (user == null) {
    return res.status(404).json({
      message: "Verification code not valid",
      data: "",
      success: false,
    });
  } else {
    const mailOptions = {
      from: emailAddress,
      to: user.email,
      subject: "ACCOUNT VERIFICATION",
      text: `This is your verification code ${user.verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Verification code sent successfully",
      data: "",
      success: true,
    });
  }
});
/****************************************************************************************************
VERIFY => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
PROFILE => START
 ***************************************************************************************************/
// Profile Route
router.get("/profile", userAuth, async (req, res) => {
  const user = serializeUser(req.user);
  // console.log(req)
  return res.status(200).json({
    message: "user found",
    data: user,
    success: true,
  });
});
/****************************************************************************************************
PROFILE => ENDS
****************************************************************************************************/
/****************************************************************************************************
 FOLLOW USER => START
****************************************************************************************************/
router.put("/:id/follow", userAuth, async (req, res) => {
  const user = req.user._id;
  const followUser = await User.findById(req.params.id);
  try {
    if (followUser.followers.includes(user)) {
      const updatedFollowUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { followers: user },
        },
        { new: true }
      );
      await User.findByIdAndUpdate(
        user,
        {
          $pull: { followings: req.params.id },
        },
        { new: true }
      );
      res.status(200).json({
        message: "You unfollow user",
        data: updatedFollowUser,
        success: true,
      });
    } else {
      const updatedFollowUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $push: { followers: user },
        },
        { new: true }
      );
      await User.findByIdAndUpdate(
        user,
        {
          $push: { followings: req.params.id },
        },
        { new: true }
      );
      res.status(200).json({
        message: "You are now following this user",
        data: updatedFollowUser,
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
FOLLOW USER => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET A USER => START
****************************************************************************************************/
router.get("/", userAuth, async (req, res) => {
  const username = req.query.username;
  try {
    const user = await User.findOne({ userName: username });
    if (user.role === "admin") {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.json(serializeUser(user));
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET A USER => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET ALL USERS => START
****************************************************************************************************/
router.get("/all/users", userAuth, checkRole(["admin"]), async (req, res) => {
  const user = await User.find({ role: "user" });
  try {
    var result = user.map((eachUser) => serializeUser(eachUser));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET ALL USERS => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET SUGGESTED USERS => START
****************************************************************************************************/
router.get("/suggestedfriends", userAuth, async (req, res) => {
  const user = req.user._id.toString();
  const users = await User.find({ role: "user" });
  const activeUser = await User.findById(user);
  console.log("active followings", activeUser.followings);
  var userDetails = [];

  try {
    // var result = users.map((eachUser) => serializeUser(eachUser));
    var usersId = users.map((eachUser) => eachUser._id.toString());
    const userFollowings = activeUser.followings;

    console.log("us fol", userFollowings);

    const finalResult =
      userFollowings.length > 0
        ? usersId.filter((str) => !userFollowings.includes(str))
        : usersId;

    console.log("fin", finalResult);

    for (const x of finalResult) {
      const userDet = await User.findOne({ _id: x }).exec();
      const serilizeUserDet = serializeUser(userDet);
      serilizeUserDet._id.toString() == user
        ? null
        : userDetails.push(serilizeUserDet);
    }
    console.log("final res", userDetails);

    res.status(200).json({
      message: "Suggested friends found",
      data: userDetails,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: err, data: "", success: false });
  }
});
/****************************************************************************************************
GET SUGGESTED USERS => ENDS
****************************************************************************************************/

/****************************************************************************************************
UPDATE USER => START
****************************************************************************************************/
router.put("/:username", upload.single("file"), userAuth, async (req, res) => {
  const user = req.user.userName;
  const userAccount = await User.findOne({ userName: req.params.username });
  try {
    if (user === userAccount.userName) {
      await userAccount.updateOne({ $set: req.body }, { runValidators: true });
      const updatedUserAccount = await User.findOne({
        userName: req.params.username,
      });
      const userDets = serializeUser(updatedUserAccount);
      return res.status(200).json(userDets);
    } else {
      return res.status(403).json({
        message: "You can update only your account!",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
UPDATE USER => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET ALL FOLLOWERS => START
****************************************************************************************************/
router.get("/all/followers", userAuth, async (req, res) => {
  const user = req.user._id;
  const activeUser = await User.findById(user._id).populate({
    path: "followers",
    model: "users",
  });
  const userFollowers = activeUser.followers;
  try {
    var result = userFollowers.map((eachUser) => serializeUser(eachUser));
    res.status(200).json({
      message: "Followers fetched",
      data: result,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: err, data: "", success: false });
  }
});
/****************************************************************************************************
GET ALL FOLLOWERS => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET ALL FOLLOWINGS => START
****************************************************************************************************/
router.get("/all/followings", userAuth, async (req, res) => {
  const user = req.user._id;
  const activeUser = await User.findById(user._id).populate({
    path: "followings",
    model: "users",
  });
  const userFollowings = activeUser.followings;
  try {
    var result = userFollowings.map((eachUser) => serializeUser(eachUser));
    res.status(200).json({
      message: "Followings fetched",
      data: result,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: err, data: "", success: false });
  }
});
/****************************************************************************************************
GET ALL FOLLOWINGS => ENDS
****************************************************************************************************/
/****************************************************************************************************
QUERY USERS => START
****************************************************************************************************/
router.get("/search", userAuth, async (req, res) => {
  const query = req.query.q; // Get the search query parameter from the URL

  try {
    // Perform a case-insensitive search for users whose name or email matches the query
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    });
    // console.log("search users", users);
    var result = users.map((eachUser) => serializeUser(eachUser));
    res.json({ message: "Users found", data: result, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, data: "", success: false });
  }
});
/****************************************************************************************************
QUERY USERS => ENDS
****************************************************************************************************/
/****************************************************************************************************
UPDATE PROFILE PICTURE => START
****************************************************************************************************/
router.put(
  "/upload/:username",
  upload.single("file"),
  userAuth,
  async (req, res) => {
    const user = req.user.userName;
    const avatar = req.file;
    const userAccount = await User.findOne({ userName: req.params.username });
    try {
      if (user === userAccount.userName) {
        await userAccount.updateOne(
          { $set: { avatar: avatar?.location } },
          { runValidators: true }
        );
        const updatedUserAccount = await User.findOne({
          userName: req.params.username,
        });
        const userDets = serializeUser(updatedUserAccount);
        return res.status(200).json(userDets);
      } else {
        return res.status(403).json({
          message: "You can update only your account!",
          success: false,
        });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  }
);
/****************************************************************************************************
UPDATE PROFILE PICTURE => ENDS
****************************************************************************************************/

module.exports = router;
