const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Set EJS as the template engine
app.set("view engine", "ejs");

// Set the views directory (default is "views")
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.get("/", (req, res) => {
//   // res.render("splashPage");
//   // res.render("joinCommunity");
//   // res.render("confirmRegistration");
//   // res.render("acknowledgement");
//   res.render("profile", {
//     user: {
//       username: "James Bond",
//       status: "emergency",
//       image: "image-23.png",
//     },
//   });
// });
app.get("/", (req, res) => {
  res.render("splashPage");
});

app.get("/join", (req, res) => {
  res.render("joinCommunity");
});
app.get("/confirm", (req, res) => {
  res.render("confirmRegistration");
});
app.get("/acknowledgement", (req, res) => {
  res.render("acknowledgement");
});
app.get("/profile", (req, res) => {
  res.render("profile", {
    user: {
      username: "James Bond",
      status: "ok",
      image: "./images/photos/user-profiles/user1-james.png",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});

module.exports = app;
