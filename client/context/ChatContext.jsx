import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

// eslint-disable-next-line react-refresh/only-export-components
export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { socket, axios, authUser } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  // 🔒 stable ref to avoid race conditions
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // -------------------------
  // ✅ GET USERS (SIDEBAR)
  // -------------------------
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // -------------------------
  // ✅ GET MESSAGES
  // -------------------------
  const getMessages = async (userId) => {
    if (!userId) return;

    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // -------------------------
  // ✅ RESET UNSEEN WHEN CHAT OPENS
  // -------------------------
  useEffect(() => {
    if (!selectedUser?._id) return;

    setUnseenMessages((prev) => ({
      ...prev,
      [selectedUser._id]: 0,
    }));
  }, [selectedUser?._id]);

  // -------------------------
  // 📡 SOCKET: NEW MESSAGE
  // -------------------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const currentChat = selectedUserRef.current;

      const senderId =
        typeof message.senderId === "object"
          ? message.senderId._id
          : message.senderId;

      // -------------------------
      // 🟢 IF CHAT IS OPEN
      // -------------------------
      if (currentChat && senderId === currentChat._id) {
        setMessages((prev) =>
          prev.some((m) => m._id === message._id)
            ? prev
            : [...prev, message]
        );

        // mark seen
        axios.put(`/api/messages/mark/${message._id}`).catch(() => {});
      }
      // -------------------------
      // 🔴 CHAT NOT OPEN → UNSEEN++
      // -------------------------
      else {
        setUnseenMessages((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, axios]);

  // -------------------------
  // ✅ CONTEXT VALUE
  // -------------------------
  const value = {
    users,
    messages,
    selectedUser,
    unseenMessages,
    setSelectedUser,
    getUsers,
    getMessages,
    setMessages,
    setUnseenMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
