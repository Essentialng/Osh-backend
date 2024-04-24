const router = require("express").Router();
const Facet = require("../models/Facet");

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
REGISTRATIONS => STARTS
 ***************************************************************************************************/
// facet Registeration Route
router.post(
  "/register-facet",
  userAuth,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const newFacet = new Facet(req.body);
      newFacet.name = req.body.name;
      newFacet.description = req.body.description;
      let validateFacet = await Facet.findOne({ name: req.body.name });
      if (validateFacet) {
        return res.status(400).json({
          message: `Facet already exist.`,
          success: false,
        });
      }
      await newFacet.save();
      return res.status(201).json({
        message: "Hurry! now you have successfully created a facet.",
        success: true,
      });
    } catch (err) {
      // Implement logger function (winston)
      return res.status(500).json({
        message: "Unable to create new facet.",
        success: false,
      });
    }
  }
);

/****************************************************************************************************
REGISTRATIONS => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
GET ALL FACETS => STARTS
 ***************************************************************************************************/
router.get("/all", userAuth, async (req, res) => {
  const facet = await Facet.find();
  try {
    res.status(200).json({
      message: "Facets fetched",
      data: facet,
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
GET ALL FACETS => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
UPDATE FACET => START
****************************************************************************************************/
router.put("/:name", userAuth, checkRole(["admin"]), async (req, res) => {
  const facet = await Facet.findOne({ name: req.params.name });
  try {
    if (facet) {
      const updatedFacet = await facet.updateOne(
        { $set: req.body },
        { runValidators: true }
      );
      return res.status(200).json(updatedFacet);
    } else {
      return res.status(403).json({
        message: "Facet not found!",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
UPDATE FACET => ENDS
****************************************************************************************************/

/****************************************************************************************************
ADD SUBSCRIBERS => START
****************************************************************************************************/
router.put("/:facetname/subscribe", userAuth, async (req, res) => {
  console.log("server facet func");
  // const user = req.user._id;
  const user = req.user._id;
  const facet = await Facet.findOne({ name: req.params.facetname });
  if (!facet) {
    return res.status(404).json({
      message: "Facet not found!",
      success: false,
    });
  }
  const facetSubscribers = facet.subscribers;
  try {
    if (!facetSubscribers.includes(user)) {
      await facet.updateOne({
        $push: { subscribers: user },
      });
      const updatedFacet = await Facet.findOne({ name: req.params.facetname });
      res.status(200).json({
        message: "You have successfully subscribe from this facet",
        data: updatedFacet,
        success: true,
      });
    } else {
      await facet.updateOne({
        $pull: { subscribers: user },
      });
      const updatedFacet = await Facet.findOne({ name: req.params.facetname });
      res.status(200).json({
        message: "You have successfully unsubscribe from this facet",
        data: updatedFacet,
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
ADD SUBSCRIBERS => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET ALL FACET USER SUBSCRIBE TO => START
****************************************************************************************************/
router.get("/subscribe", userAuth, async (req, res) => {
  const user = req.user._id;
  const facet = await Facet.find({ subscribers: user });
  let renderFacet = facet;
  const all = {
    __v: 9,
    _id: "all",
    createdAt: "2023-07-04T21:16:41.132Z",
    description: "",
    facetIcon: "",
    name: "all",
    subscribers: [],
    updatedAt: "2023-08-12T22:17:11.153Z",
  };

  const finalRenderFacet = renderFacet.unshift(all);

  try {
    res.status(200).json({
      message: "Facets fetched",
      data: facet,
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
GET ALL FACET USER SUBSCRIBE TO => ENDS
****************************************************************************************************/

module.exports = router;
