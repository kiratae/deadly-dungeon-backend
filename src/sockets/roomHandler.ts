// src/sockets/roomHandler.ts
import { Server, Socket } from 'socket.io';
import { allRooms } from '../state.js';
import type { RoomState } from '../types/RoomState.js';
import type { Player } from '../types/Player.js';

export const registerRoomHandlers = (io: Server, socket: Socket) => {

    // สร้างห้อง
    socket.on('create_room', (playerName: string) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        const newRoom: RoomState = {
            roomId,
            hostId: socket.id,
            gameStarted: false,
            map: null,
            gameManager: null,
            devilManager: null,
            turnManager: null,
            players: new Map()
        };

        allRooms.set(roomId, newRoom);
        socket.join(roomId);

        console.log(`🏠 Room Created: ${roomId} by ${playerName}`);
        socket.emit('room_created', { roomId, hostId: socket.id });
    });

    // จอยห้อง
    socket.on('join_room', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
        const room = allRooms.get(roomId.toUpperCase());
        if (!room) return socket.emit('error_message', 'ไม่พบห้องนี้');

        const newPlayer: Player = {
            id: socket.id,
            name: playerName,
            pos: { x: 0, y: 0 },
            isAlive: true,
            hasMoved: false,
            pendingMove: null
        };

        room.players.set(socket.id, newPlayer);
        socket.join(roomId.toUpperCase());
        io.to(roomId.toUpperCase()).emit('player_joined', Array.from(room.players.values()));
    });
};