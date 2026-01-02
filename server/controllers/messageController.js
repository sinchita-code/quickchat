import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";

/* -------------------------------------------------
   GET USERS FOR SIDEBAR (WITH UNSEEN COUNT)
------------------------------------------------- */
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;

    const users = await User.find({ _id: { $ne: userId } })
      .select("-password");

    const unseenMessages = {};

    await Promise.all(
      users.map(async (user) => {
        const count = await Message.countDocuments({
          senderId: user._id,
          receiver: userId,
          seen: false,
        });
        if (count > 0) unseenMessages[user._id] = count;
      })
    );

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------
   GET MESSAGES + MARK AS SEEN
------------------------------------------------- */
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const selectedUserId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiver: selectedUserId },
        { senderId: selectedUserId, receiver: myId },
      ],
    }).sort({ createdAt: 1 });

    // ✅ mark unseen messages as seen
    await Message.updateMany(
      { senderId: selectedUserId, receiver: myId, seen: false },
      { seen: true }
    );

    // ✅ notify sender that messages are seen
    const senderSocketId = userSocketMap[selectedUserId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        from: myId,
      });
    }

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------
   MARK SINGLE MESSAGE AS SEEN
------------------------------------------------- */
export const markMessageAsSeen = async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { seen: true });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------
   SEND MESSAGE (TEXT / IMAGE)
------------------------------------------------- */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiver = req.params.id;
    const text = req.body?.text || "";

    if (!text && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Message text or image is required",
      });
    }

    let imageUrl = null;

    // ✅ upload image if exists
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "chat-app",
        resource_type: "auto",
      });
      imageUrl = upload.secure_url;
    }

    // ✅ create message (seen=false, delivered=false by default)
    let message = await Message.create({
      senderId,
      receiver,
      text,
      image: imageUrl,
    });

    let populatedMessage = await Message.findById(message._id)
      .populate("senderId", "fullName profilePic")
      .populate("receiver", "fullName profilePic");

    const receiverSocketId = userSocketMap[receiver];
    const senderSocketId = userSocketMap[senderId];

    /* ------------------------------------
       DELIVERED LOGIC
    ------------------------------------ */
    if (receiverSocketId) {
      message.delivered = true;
      await message.save();

      populatedMessage.delivered = true;

      // ✅ send message to receiver
      io.to(receiverSocketId).emit("newMessage", populatedMessage);

      // ✅ increment unread if receiver is NOT viewing chat
      io.to(receiverSocketId).emit("incrementUnread", {
        from: senderId,
      });
    }

    /* ------------------------------------
       NOTIFY SENDER (DELIVERED TICK)
    ------------------------------------ */
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDelivered", {
        messageId: message._id,
      });
    }

    res.status(201).json({
      success: true,
      newMessage: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
