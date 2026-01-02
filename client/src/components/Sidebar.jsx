import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import assets from "../assets/assets";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  } = useContext(ChatContext);

  const { logout, onlineUsers, authUser } = useContext(AuthContext);

  const [input, setInput] = useState("");
  const navigate = useNavigate();

  // -----------------------------
  // 🔍 SEARCH FILTER
  // -----------------------------
  const filteredUsers = input
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  // -----------------------------
  // 🔁 REFRESH USERS ON ONLINE CHANGE
  // -----------------------------
  useEffect(() => {
    getUsers();
  }, [onlineUsers]);

  return (
    <div
      className={`bg-[#818582]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${
        selectedUser ? "max-md:hidden" : ""
      }`}
    >
      {/* ================= HEADER ================= */}
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />

          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />

            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p onClick={logout} className="cursor-pointer text-sm">
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="bg-[#282142] rounded-full flex items-center gap-2 px-4 mt-5 py-3">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="text"
            placeholder="Search User..."
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
          />
        </div>
      </div>

      {/* ================= USER LIST ================= */}
      <div className="flex flex-col">
        {filteredUsers.map((user) => {
          if (!user?._id || user._id === authUser?._id) return null;

          const isOnline = onlineUsers.includes(user._id);
          const unseenCount = unseenMessages[user._id] || 0;

          return (
            <div
              key={user._id}
              onClick={() => {
                setSelectedUser(user);

                // ✅ Reset unread count on open
                setUnseenMessages((prev) => ({
                  ...prev,
                  [user._id]: 0,
                }));
              }}
              className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${
                selectedUser?._id === user._id && "bg-[#282142]/50"
              }`}
            >
              {/* Avatar */}
              <img
                src={user.profilePic || assets.avatar_icon}
                alt=""
                className="w-[35px] aspect-square rounded-full"
              />

              {/* Name + Status */}
              <div className="flex flex-col leading-5">
                <p>{user.fullName}</p>
                <span
                  className={`text-xs ${
                    isOnline ? "text-green-400" : "text-neutral-400"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              {/* 🔔 UNSEEN BADGE */}
              {unseenCount > 0 && (
                <span className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/70">
                  {unseenCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
