import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { SocketProvider } from '../context/SocketContext';

import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <SocketProvider>
      <AuthProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </AuthProvider>
    </SocketProvider>
  </BrowserRouter>
);
