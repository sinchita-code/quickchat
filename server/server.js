import cors from "cors";
import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import messageRouter from "./routes/messageRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();
const server = http.createServer(app);

// -----------------------
// ✅ CORS CONFIG
// -----------------------
const corsOptions = {
  origin: ["https://quickchat-client3.onrender.com"],
  credentials: true,
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -----------------------
// ✅ SOCKET.IO SETUP
// -----------------------
export const io = new Server(server, {
  cors: {
    origin: ["https://quickchat-client3.onrender.com"],
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// -----------------------
// ✅ ONLINE USERS MAP
// -----------------------
export const userSocketMap = {};

// Helper (used by controller)
export const getReceiverSocketId = (userId) => userSocketMap[userId];

// -----------------------
// 🔌 SOCKET CONNECTION
// -----------------------
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  // ❌ No userId → disconnect immediately
  if (!userId) {
    console.warn("⚠️ Socket connected without userId");
    socket.disconnect(true);
    return;
  }

  console.log("🟢 User online:", userId);

  // ✅ Save socket (overwrite old if exists)
  userSocketMap[userId] = socket.id;

  // ✅ Broadcast online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // -----------------------
  // 🔴 DISCONNECT
  // -----------------------
  socket.on("disconnect", () => {
    console.log("🔴 User offline:", userId);

    // Safety check
    if (userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// -----------------------
// 📌 ROUTES
// -----------------------
app.use("/api/status", (req, res) =>
  res.send("Server is running 🚀")
);
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// -----------------------
// 🚀 START SERVER
// -----------------------
await connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
