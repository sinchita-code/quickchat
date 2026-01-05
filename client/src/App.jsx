// React
import { useContext } from "react";

// Router
import { Navigate, Route, Routes } from "react-router-dom";

// Toast
import { Toaster } from "react-hot-toast";

// Contexts
import { AuthContext } from "../context/AuthContext.jsx";
import { SocketProvider } from "../context/SocketContext.jsx";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";

const App = () => {
  const { authUser } = useContext(AuthContext);

  return (
    <div className="bg-[url('./src/assets/image.jpg')] bg-contain min-h-screen">
      <Toaster position="top-right" />

      <SocketProvider>
        <Routes>
          {/* Home / Chat */}
          <Route
            path="/"
            element={authUser ? <HomePage /> : <Navigate to="/login" replace />}
          />

          {/* Login / Signup */}
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" replace />}
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />}
          />

          {/* Catch-all (optional but recommended) */}
          <Route
            path="*"
            element={<Navigate to={authUser ? "/" : "/login"} replace />}
          />
        </Routes>
      </SocketProvider>
    </div>
  );
};

export default App;
