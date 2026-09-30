import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

// Realtime socket (Socket.IO). Disabled by default on the Cloudflare-native
// frontend: the v1 worker has no Socket.IO server, and an always-retrying
// client just spams failing wss/polling requests. Set
// VITE_REALTIME_ENABLED=true once the Durable-Object realtime channel lands.
const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED === 'true';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name?: string; role?: string }[]>([]);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!REALTIME_ENABLED) return;
    if (!user || !token) return;
    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    const socket = io(SOCKET_URL, { 
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      socket.emit('join_room', user.id, user.name, user.role);
    });

    socket.on('online_users', (data: { count: number; users: any[] }) => {
      setOnlineCount(data.count || 0);
      setOnlineUsers(data.users || []);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [user?.id]);

  return { socket: socketInstance, onlineCount, onlineUsers };
}
