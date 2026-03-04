import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoomHandlers } from './sockets/roomHandler.js';
import { registerGameHandlers } from './sockets/gameHandler.js';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // ในอนาคตให้แก้เป็น URL ของ Frontend ของคุณ
    methods: ["GET", "POST"]
  }
});



const PORT = process.env.PORT || 3001;

// เมื่อมีคนเชื่อมต่อเข้ามา
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Dungeon Server is running on http://localhost:${PORT}`);
});