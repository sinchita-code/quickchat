import express from "express";
import multer from "multer";
import {
    getMessages,
    getUsersForSidebar,
    markMessageAsSeen,
    sendMessage,
} from "../controllers/messageController.js";
import { protectRoute } from "../middleware/auth.js";
import Message from "../models/Message.js";
import { io, userSocketMap } from "../server.js";

const upload = multer({ dest: "uploads/" });

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);

messageRouter.put("/mark-seen/:userId", protectRoute, async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        senderId: otherUserId,
        receiver: myId,
        seen: false,
      },
      { seen: true }
    );

    const senderSocketId = userSocketMap[otherUserId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { from: myId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

messageRouter.post(
  "/send/:id",
  protectRoute,
  upload.single("image"),
  sendMessage
);

export default messageRouter;
