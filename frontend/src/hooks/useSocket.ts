import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name?: string; role?: string }[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

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
    };
  }, [user?.id]);

  return { socket: socketRef.current, onlineCount, onlineUsers };
}
