import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name?: string; role?: string }[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
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
