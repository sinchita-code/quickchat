import axios from "axios";
import { createContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  // -----------------------------
  // 🔐 Axios auth header helper
  // -----------------------------
  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  };

  // -----------------------------
  // ✅ CHECK AUTH ON REFRESH
  // -----------------------------
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setAuthHeader(token);

      const { data } = await axios.get("/api/auth/check");

      if (data.success && data.user) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      console.error("Auth check failed");
      localStorage.removeItem("token");
      setAuthHeader(null);
      setAuthUser(null);
    }
  };

  // -----------------------------
  // ✅ LOGIN / SIGNUP
  // -----------------------------
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);

      if (!data.success) {
        toast.error(data.message);
        return data;
      }

      localStorage.setItem("token", data.token);
      setAuthHeader(data.token);
      setAuthUser(data.user);
      connectSocket(data.user);

      toast.success(data.message);
      return data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // -----------------------------
  // ✅ LOGOUT
  // -----------------------------
  const logout = () => {
    localStorage.removeItem("token");
    setAuthHeader(null);
    setAuthUser(null);
    setOnlineUsers([]);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    toast.success("Logged out successfully");
  };

  // -----------------------------
  // ✅ UPDATE PROFILE
  // -----------------------------
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);

      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // -----------------------------
  // 🔌 SOCKET CONNECTION (ONLINE / OFFLINE)
  // -----------------------------
  const connectSocket = (user) => {
    if (!user || socketRef.current) return;

    const socket = io(backendUrl, {
      query: { userId: user._id },
      transports: ["websocket"], // stable
    });

    socketRef.current = socket;

    socket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  };

  // -----------------------------
  // 🚀 INIT ON APP LOAD
  // -----------------------------
  useEffect(() => {
    checkAuth();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const value = {
    axios,
    authUser,
    setAuthUser,
    onlineUsers,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
