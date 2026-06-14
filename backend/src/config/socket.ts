import { Server } from 'socket.io';
import http from 'http';

let io: Server;

const onlineUsers = new Map<string, { socketId: string; name?: string; role?: string }>();

export function createSocketServer(server: http.Server) {
  io = new Server(server, {
    cors: {
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('A user connected via socket:', socket.id);

    socket.on('join_room', (userId: string, name?: string, role?: string) => {
      socket.join(userId);
      if (role === 'admin' || role === 'super_admin') {
        socket.join('admin_room');
      }
      console.log(`User ${userId} joined their personal room${role === 'admin' || role === 'super_admin' ? ' (admin)' : ''}`);
      onlineUsers.set(userId, { socketId: socket.id, name, role });
      io.emit('online_users', {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name, role: data.role })),
      });
    });

    socket.on('typing', (data: { receiverId: string; senderId: string }) => {
      io.to(data.receiverId).emit('user_typing', { senderId: data.senderId, typing: true });
    });

    socket.on('stop_typing', (data: { receiverId: string; senderId: string }) => {
      io.to(data.receiverId).emit('user_typing', { senderId: data.senderId, typing: false });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [userId, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('online_users', {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, name: data.name, role: data.role })),
      });
    });
  });

  return io;
}

export function emitDashboardUpdate() {
  if (io) {
    io.to('admin_room').emit('dashboard:update');
  }
}

export function emitStudentUpdate(userId: string) {
  if (io) {
    io.to(userId).emit('student:dashboard:update');
  }
}

export { io, onlineUsers };
