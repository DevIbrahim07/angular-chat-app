const express = require("express");
const cors = require("cors");
const path = require("path");
const chatRoutes = require("./modules/chat/chat.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const conversationsRoutes = require("./modules/conversations/conversations.routes");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api", chatRoutes);
app.use("/api", authRoutes);
app.use("/api", usersRoutes);
app.use("/api", conversationsRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

module.exports = app;
