import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.warn("⚠️ No auth token found. Socket not connected.");
            return;
        }

        // ✅ IMPORTANT: Use HTTP URL, NOT ws://
        const socketUrl = import.meta.env.VITE_BACKEND_URL;

        // ✅ Create socket ONCE
        socketRef.current = io(socketUrl, {
            auth: { token },
            withCredentials: true,
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        const socket = socketRef.current;

        socket.on("connect", () => {
            console.log("🟢 Socket connected:", socket.id);
            setIsConnected(true);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔴 Socket disconnected:", reason);
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("❌ Socket connection error:", err.message);
        });

        // ✅ Cleanup ONLY when app unmounts
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // 👈 DO NOT add dependencies here

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                isConnected,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used inside SocketProvider");
    }
    return context;
};
