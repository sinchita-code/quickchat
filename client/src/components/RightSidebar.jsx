import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
import assets from '../assets/assets';

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { logout, onlineUsers, authUser } = useContext(AuthContext);

  const [msgImages, setMsgImages] = useState([]);

  // ✅ Only images SENT BY ME (WhatsApp behaviour)
  useEffect(() => {
    if (!messages || !authUser?._id) return;

    const images = messages
      .filter(
        (msg) =>
          msg.image &&
          (typeof msg.senderId === 'string'
            ? msg.senderId === authUser._id
            : msg.senderId?._id === authUser._id)
      )
      .map((msg) => msg.image);

    setMsgImages(images);
  }, [messages, authUser?._id]);

  if (!selectedUser) return null;

  return (
    <div className="bg-[#8185B2]/10 w-full relative text-white max-md:hidden flex flex-col">
      {/* Profile */}
      <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt=""
          className="w-20 aspect-square rounded-full"
        />

        <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
          {selectedUser.fullName}
        </h1>

        <p className="px-10 mx-auto text-center opacity-80">
          {selectedUser.bio}
        </p>
      </div>

      <hr className="border-[#ffffff50] my-4" />

      {/* Media Section */}
      <div className="px-5 text-xs flex-1 min-h-0">
        <p className="mb-2">Media</p>

        {msgImages.length === 0 ? (
          <p className="opacity-50 text-center mt-4">No media shared</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
            {msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url, '_blank')}
                className="cursor-pointer rounded-md overflow-hidden hover:opacity-90 transition"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-24 object-cover rounded-md"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="m-5 bg-gradient-to-r from-purple-400 to-violet-600 text-white text-sm font-light py-2 rounded-full"
      >
        Logout
      </button>
    </div>
  );
};

export default RightSidebar;
