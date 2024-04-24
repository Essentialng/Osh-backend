// const cors = require("cors");
const exp = require("express");
const bp = require("body-parser");
const { success, error } = require("consola");
const { connect } = require("mongoose");
const passport = require("passport");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");

// Initialize the application
const app = exp();
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log(`${socket.id} user is just connected`);

  socket.on("disconnect", () => {
    console.log(`${socket.id} user is just disconnected`);
  });
});

// const socketIO = require("socket.io")(http, {
//   cors: {
//     origin: "http://192.168.79.149:3000/",
//   },
// });

// Bring in the app constants
const { DB, PORT } = require("./config");

var cors = require("cors");
app.use(cors({ origin: true, credentials: true }));

// Middlewares
app.use(cors());
app.use(bp.json());
app.use(passport.initialize());

require("./middlewares/passport")(passport);

// User Router Middleware
app.use("/api/users", require("./routes/users"));
app.use("/api/password", require("./routes/nodemailer"));
app.use("/api/facets", require("./routes/facets"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/group", require("./routes/group"));
app.use("/api/discourse", require("./routes/discourse"));
app.use("/api/reels", require("./routes/reels"));
app.use("/api/status", require("./routes/status"));
app.use("/api/calls", require("./routes/calls"));

const startApp = async () => {
  try {
    // Connection with DB
    await connect(DB, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    success({
      message: `Successfully connected with the Database \n${DB}`,
      badge: true,
    });
    // Start listening for the server on PORT
    app.listen(PORT, () =>
      success({ message: `Server started on PORT ${PORT}`, badge: true })
    );
  } catch (err) {
    error({
      message: `Unable to connect with Database \n${err}`,
      badge: true,
    });
    startApp();
  }
};

startApp();
