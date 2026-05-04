const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const server = http.createServer(app);
const connectDB = require("./config/db");
const chatSocket = require("./modules/chat/chat.socket");
connectDB();

// socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Initialize chat socket
chatSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
