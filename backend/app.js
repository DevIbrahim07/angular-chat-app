const express = require("express");
const cors = require("cors");
const path = require("path");
const chatRoutes = require("./modules/chat/chat.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const conversationsRoutes = require("./modules/conversations/conversations.routes");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://angular-chat-app-ten.vercel.app",
  "http://localhost:4200",
  "http://127.0.0.1:4200",
].filter(Boolean);

// middlewares
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
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
