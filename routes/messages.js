const router = require("express").Router();
const Discourse = require("../models/Discourse");
const Message = require("../models/Message");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { accessKeyId, secretAccessKey, region } = require("../config");

// Bring in the User Registration function
const {
  facetRegister,
  userAuth,
  checkRole,
  validateFacet,
} = require("../utils/Auth");

const s3 = new aws.S3({
  accessKeyId,
  secretAccessKey,
  region,
});

const upload = (bucketName, uniqueName) =>
  multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        cb(null, `profile${uniqueName}.jpeg`);
        // cb(null, 'image.jpeg'});
      },
    }),
  });

/****************************************************************************************************
CREATE => STARTS
 ***************************************************************************************************/
router.post("/:discourseId/create-message", userAuth, async (req, res) => {
  const currentDiscourse = await Discourse.findOne({
    topic: req.params.discourseId,
  });
  try {
    const newMessage = new Message(req.body);
    newMessage.text = req.body.text;
    newMessage.user = req.user.userName;

    await newMessage.save();
    return res.status(201).json({
      message: "Hurry! now you have successfully created a discourse.",
      data: newMessage,
      success: true,
    });
  } catch (err) {
    // Implement logger function (winston)
    return res.status(500).json({
      message: "Unable to create new discourse.",
      data: "",
      success: false,
    });
  }
});

/****************************************************************************************************
CREATE => ENDS
 ***************************************************************************************************/

module.exports = router;
