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
app.get("/", (req, res) => {
  // res.render("splashPage");
  // res.render("joinCommunity");
  res.render("confirmRegistration");
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});

module.exports = app;
