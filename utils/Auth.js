const User = require("../models/User");
const Timeline = require("../models/Timeline");
const Chats = require("../models/Chats");
const Notification = require("../models/Notification");
const Channel = require("../models/Group");
const SuggestedChannels = require("../models/SuggestedChannel");
const SavedPosts = require("../models/SavedPosts");
const ReelTimeline = require("../models/ReelTimeline");
const StatusTimeline = require("../models/StatusTimeline");
const Facet = require("../models/Facet");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const {
  SECRET,
  emailAddress,
  emailPassword,
  streamApiKey,
  streamApiSecret,
} = require("../config");
const { registerValidation, loginValidation } = require("../utils/validation");
const transporter = require("./emailConfig");
// const stream = require("getstream");
const { StreamChat } = require("stream-chat");

// const client = stream.connect(streamApiKey, streamApiSecret);
const chatClient = new StreamChat(streamApiKey, streamApiSecret);

/****************************************************************************************************
REGISTRATION AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC To register the user (ADMIN, USER)
 */

const userRegister = async (userDets, avatar, role, res) => {
  try {
    // Validate the username
    let usernameNotTaken = await validateUsername(userDets.userName);
    if (!usernameNotTaken) {
      return res.status(400).json({
        message: `Username is already taken.`,
        success: false,
      });
    }

    // Validate the email
    let emailNotRegistered = await validateEmail(userDets.email);
    if (!emailNotRegistered) {
      return res.status(400).json({
        message: `Email is already registered.`,
        success: false,
      });
    }

    console.log("email", emailNotRegistered);

    // Get the hashed password
    const password = await bcrypt.hash(userDets.password, 12);

    function generateRandomNumbers() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const verificationCode = generateRandomNumbers();

    // const token = client.createUserToken(userDets.userName);
    const token = chatClient.createToken(userDets.userName);

    // create a new user
    const newUser = new User({
      ...userDets,
      avatar,
      password,
      verificationCode,
      getStreamToken: token,
      role,
    });

    await chatClient.updateUsers([
      {
        id: userDets.userName,
        name: userDets.userName,
      },
    ]);

    await newUser.save();

    const mailOptions = {
      from: emailAddress,
      to: userDets.email,
      subject: "ACCOUNT VERIFICATION",
      text: `This is your verification code ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    const newTimeline = new Timeline();
    newTimeline.user = newUser._id;
    await newTimeline.save();

    const newNotification = new Notification();
    newNotification.user = newUser._id;
    await newNotification.save();

    const newChats = new Chats();
    newChats.user = newUser._id;
    await newChats.save();

    const newSavedPosts = new SavedPosts();
    newSavedPosts.user = newUser._id;
    await newSavedPosts.save();

    const newReelTimeline = new ReelTimeline();
    newReelTimeline.user = newUser._id;
    await newReelTimeline.save();

    const newStatusTimeline = new StatusTimeline();
    newStatusTimeline.user = newUser._id;
    await newStatusTimeline.save();

    return res.status(201).json({
      message: "You have successfully registered, Kindly verify your accouunt.",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to create your account, try again later.",
      success: false,
    });
  }
};

/****************************************************************************************************
REGISTRATIONS AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
LOGIN AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC To login the user (ADMIN, USER)
 */
const userLogin = async (userCreds, role, res) => {
  let { input, password } = userCreds;

  let user = "";
  let userEmail = await User.findOne({ email: input });
  if (!userEmail) {
    let userUserName = await User.findOne({ userName: input });
    if (!userUserName) {
      return res.status(404).json({
        message: "Username is not found. Invalid login credentials.",
        success: false,
      });
    } else {
      user = userUserName;
    }
  } else {
    user = userEmail;
  }

  if (user.isVerified == false) {
    return res.status(403).json({
      message: "You are not yet verified!",
      success: false,
    });
  }

  // we will check the role
  if (user.role !== role) {
    return res.status(403).json({
      message: "Please make sure you are loggin in from the right portal.",
      success: false,
    });
  }

  // That means user is existing and trying to signin from the right portal
  //Now check for the password
  let isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    //Sign in the token and issue it to the user
    let token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        username: user?.userName,
        email: user.email,
      },
      SECRET,
      { expiresIn: "7 days" }
    );

    let result = {
      username: user?.userName,
      isVerified: user.isVerified,
      role: user.role,
      _id: user._id,
      email: user.email,
      token: `Bearer ${token}`,
      expiresIn: 168,
    };

    if (user.getStreamToken == "") {
      const token = client.createUserToken(user?.userName);
      user.getStreamToken = token;
      await user.save();
    }

    const userTimeline = await Timeline.findOne({ user: user._id });
    if (!userTimeline) {
      const newTimeline = new Timeline();
      newTimeline.user = user._id;
      await newTimeline.save();
    }

    const userNotification = await Notification.findOne({ user: user._id });
    if (!userNotification) {
      const newNotification = new Notification();
      newNotification.user = user._id;
      await newNotification.save();
    }

    // const userNewSuggestedChannels = await SuggestedChannels.findOne({
    //   user: user._id,
    // });
    // if (!userNewSuggestedChannels) {
    //   const newSuggestedChannels = new SuggestedChannels();
    //   newSuggestedChannels.user = user._id;
    //   await newSuggestedChannels.save();
    // }

    const userChat = await Chats.findOne({ user: user._id });
    if (!userChat) {
      const newChats = new Chats();
      newChats.user = user._id;
      await newChats.save();
    }

    const userSavedPosts = await SavedPosts.findOne({ user: user._id });
    if (!userSavedPosts) {
      const newSavedPosts = new SavedPosts();
      newSavedPosts.user = user._id;
      await newSavedPosts.save();
    }

    const userReelTimeline = await ReelTimeline.findOne({ user: user._id });
    if (!userReelTimeline) {
      const newUserReelTimeline = new ReelTimeline();
      newUserReelTimeline.user = user._id;
      await newUserReelTimeline.save();
    }

    const userStatusTimeline = await StatusTimeline.findOne({ user: user._id });
    if (!userStatusTimeline) {
      const newUserStatusTimeline = new StatusTimeline();
      newUserStatusTimeline.user = user._id;
      await newUserStatusTimeline.save();
    }

    return res.status(200).json({
      ...result,
      message: "Login successful.",
      success: true,
    });
  } else {
    return res.status(403).json({
      message: "Incorrect password",
      success: false,
    });
  }
};
/****************************************************************************************************
LOGIN AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
VALIDATE USERNAME => STARTS
 ***************************************************************************************************/
const validateUsername = async (userName) => {
  let user = await User.findOne({ userName });
  return user ? false : true;
};

/**
 * @DESC Passport middleware
 */
const userAuth = passport.authenticate("jwt", { session: false });
/****************************************************************************************************
VALIDATE USERNAME => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
ROLES BASED AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC Check Role Middleware
 */
const checkRole = (roles) => (req, res, next) =>
  !roles.includes(req.user.role)
    ? res.status(401).json("Unauthorized")
    : next();

/****************************************************************************************************
ROLES BASED AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
VALIDATE EMAIL => STARTS
 ***************************************************************************************************/
const validateEmail = async (email) => {
  let user = await User.findOne({ email });
  return user ? false : true;
};
/****************************************************************************************************
VALIDATE EMAIL => ENDS
****************************************************************************************************/

/****************************************************************************************************
SERIALIZE USER => STARTS
 ***************************************************************************************************/
const serializeUser = (user) => {
  return {
    username: user?.userName,
    name: user?.name,
    email: user?.email,
    avatar: user?.avatar,
    birthday: user?.birthday,
    biography: user?.biography,
    address: user?.address,
    phoneNumber: user?.phoneNumber,
    gender: user?.gender,
    followers: user?.followers,
    followings: user?.followings,
    createdAt: user?.createdAt,
    updatedAt: user?.createdAt,
    _id: user?._id,
    getStreamToken: user?.getStreamToken,
  };
};
/****************************************************************************************************
SERIALIZE USER => ENDS
 ***************************************************************************************************/

module.exports = {
  checkRole,
  serializeUser,
  userRegister,
  userLogin,
  userAuth,
};
