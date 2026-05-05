const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const server = http.createServer(app);
const connectDB = require("./config/db");
const chatSocket = require("./modules/chat/chat.socket");
connectDB();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://talkora-chat.vercel.app",
  "http://localhost:4200",
  "http://127.0.0.1:4200",
].filter(Boolean);

// socket setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Initialize chat socket
chatSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
