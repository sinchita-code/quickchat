import { useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    selectedUser,
    setSelectedUser,
    messages,
    setMessages,
    setUnseenMessages,
  } = useContext(ChatContext);

  const { authUser } = useContext(AuthContext);
  const { socket } = useSocket();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const receiverIdRef = useRef(null);

  // -----------------------------
  // 🔒 Lock receiver
  // -----------------------------
  useEffect(() => {
    receiverIdRef.current = selectedUser?._id || null;
  }, [selectedUser?._id]);

  const safeId = (v) =>
    typeof v === "string" ? v : typeof v === "object" ? v?._id : null;

  // --------------------------------------------------
  // ✅ SEND MESSAGE (TEXT / IMAGE)
  // --------------------------------------------------
  const sendMessage = async ({ text = "", file = null }) => {
    const receiverId = receiverIdRef.current;
    if (!receiverId) return toast.error("Select a chat first");

    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please login again");

    if (!text && !file) return;

    const tempId = `temp-${Date.now()}`;

    const tempMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiver: receiverId,
      text,
      image: file ? URL.createObjectURL(file) : null,
      delivered: false,
      seen: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      setIsLoading(true);

      const formData = new FormData();
      if (text) formData.append("text", text);
      if (file) formData.append("image", file);

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/send/${receiverId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? data.newMessage : m))
      );
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // ✉️ TEXT SEND
  // -----------------------------
  const handleTextSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input.trim() });
  };

  // -----------------------------
  // 🖼️ IMAGE SEND
  // -----------------------------
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/"))
      return toast.error("Only images allowed");

    if (file.size > 5 * 1024 * 1024)
      return toast.error("Image must be under 5MB");

    sendMessage({ file });
  };

  // -----------------------------
  // 📡 SOCKET EVENTS
  // -----------------------------
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      const senderId = safeId(msg.senderId);

      // If chat is open → add message & mark seen
      if (senderId === selectedUser?._id) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );

        socket.emit("markSeen", {
          from: authUser._id,
          to: senderId,
        });
      }
    };

    socket.on("newMessage", onNewMessage);

    socket.on("messageDelivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, delivered: true } : m
        )
      );
    });

    socket.on("messagesSeen", ({ from }) => {
      if (from === selectedUser?._id) {
        setMessages((prev) =>
          prev.map((m) =>
            safeId(m.senderId) === authUser._id
              ? { ...m, seen: true }
              : m
          )
        );
      }
    });

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("messageDelivered");
      socket.off("messagesSeen");
    };
  }, [socket, selectedUser?._id, authUser?._id]);

  // -----------------------------
  // 📥 FETCH HISTORY + MARK SEEN
  // -----------------------------
  useEffect(() => {
    if (!selectedUser?._id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const load = async () => {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);

        // ✅ reset unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [selectedUser._id]: 0,
        }));
      }
    };

    load();
  }, [selectedUser?._id]);

  // -----------------------------
  // 🔽 AUTO SCROLL
  // -----------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a chat
      </div>
    );
  }

  // -----------------------------
  // 🖼️ UI
  // -----------------------------
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 bg-gray-800 flex items-center gap-3 shrink-0">
        <button onClick={() => setSelectedUser(null)}>←</button>
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-10 h-10 rounded-full"
          alt=""
        />
        <p className="text-white">{selectedUser.fullName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = safeId(msg.senderId) === authUser._id;

          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg ${
                  isMe ? "bg-slate-600" : "bg-gray-700"
                } text-white max-w-[70%]`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt=""
                    className="mb-2 rounded-md max-h-[300px] object-contain"
                  />
                )}

                {msg.text && <p>{msg.text}</p>}

                <p className="text-xs opacity-60 text-right mt-1">
                  {formatMessageTime(msg.createdAt)}{" "}
                  {isMe && (
                    <span>
                      {msg.seen ? "✓✓" : msg.delivered ? "✓✓" : "✓"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleTextSend}
        className="p-4 bg-gray-800 flex gap-2 items-center shrink-0"
      >
        <button type="button" onClick={() => fileInputRef.current.click()}>
          <img src={assets.gallery_icon} className="w-6 h-6" alt="media" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleFileChange}
        />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-700 text-white p-2 rounded"
          placeholder="Type a message"
          disabled={isLoading}
        />

        <button type="submit" disabled={isLoading}>
          <img src={assets.send_button} className="w-6 h-6" alt="send" />
        </button>
      </form>
    </div>
  );
};

export default ChatContainer;
