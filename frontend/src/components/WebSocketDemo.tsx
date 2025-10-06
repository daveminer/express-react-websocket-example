'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '@/hooks/useSocket';

interface ApiResponse {
  message: string;
}

interface NotificationMessage {
  message: string;
}

export default function WebSocketDemo() {
  const [message, setMessage] = useState<string>('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const socket = useSocket();

  useEffect(() => {
    // Fetch hello message
    const fetchMessage = async () => {
      try {
        const response = await axios.get<ApiResponse>('/api/hello');
        setMessage(response.data.message);
      } catch (error) {
        console.error('Error fetching message:', error);
        setMessage('Error fetching message from backend');
      }
    };

    fetchMessage();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNotification = (data: NotificationMessage) => {
      setNotifications(prev => [...prev, data.message].slice(-5)); // Keep last 5 notifications
    };

    // Socket.io event listener
    socket.on('notification', onNotification);
    console.log('WebSocket connected');

    return () => {
      socket.off('notification', onNotification);
    };
  }, [socket]);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Backend Message</h2>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{message || 'Loading...'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Server Notifications</h2>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-gray-500 italic">No notifications yet. Wait for server updates...</p>
          ) : (
            notifications.map((notif, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700">{notif}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        <p>The server sends notifications every second.</p>
      </div>
    </div>
  );
}
