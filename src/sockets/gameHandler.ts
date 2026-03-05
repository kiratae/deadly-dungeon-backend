import { Server, Socket } from 'socket.io';
import { allRooms } from '../state.js';
import { MapGenerator } from '../core/MapGenerator.js';
import { GameManager } from '../core/GameManager.js';
import { DevilManager } from '../core/DevilManager.js';
import { TurnManager } from '../core/TurnManager.js';

export const registerGameHandlers = (io: Server, socket: Socket) => {

    socket.on('start_game', (roomId: string) => {
        const room = allRooms.get(roomId);
        if (!room || room.hostId !== socket.id) return;

        room.map = new MapGenerator().generate();
        room.gameManager = new GameManager(room.map);
        room.devilManager = new DevilManager(room.map);
        room.turnManager = new TurnManager(room.gameManager, room.devilManager);
        room.gameStarted = true;

        const spawnPoints: { x: number, y: number }[] = [];
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                if (!room.map[y][x].isAnswerRoom && !room.map[y][x].isBlocked) {
                    spawnPoints.push({ x, y });
                }
            }
        }

        for (let i = spawnPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [spawnPoints[i], spawnPoints[j]] = [spawnPoints[j], spawnPoints[i]];
        }

        const alivePlayerNames = Array.from(room.players.values())
            .filter(p => p.isAlive)
            .map(p => p.name);

        let i = 0;
        room.players.forEach((player) => {
            player.pos = spawnPoints[i++];
            room.turnManager.addPlayer(player);
            const startRoom = room.map[player.pos.y][player.pos.x];

            io.to(player.id).emit('game_started', {
                roomNumber: startRoom.id,
                doors: startRoom.doors,
                turnNumber: 1,
                pendingPlayers: alivePlayerNames
            });
        });
    });

    socket.on('player_move', ({ roomId, targetPos }) => {
        const room = allRooms.get(roomId);
        if (!room || !room.turnManager) return;

        const isReady = room.turnManager.submitMove(socket.id, targetPos);

        if (isReady) {
            // 🏁 ทุกคนเดินครบ -> ประมวลผล
            const turnData = room.turnManager.processTurn();
            const currentTurn = room.turnManager.getTurnNumber();

            const nextTurnPending = room.turnManager.getPendingPlayers();

            turnData.results.forEach((res: any) => {
                io.to(res.playerId).emit('turn_result', {
                    ...res,
                    turnNumber: currentTurn,
                    pendingPlayers: nextTurnPending
                });
            });
        } else {
            // ⏳ ยังเดินไม่ครบ -> ส่งรายชื่อคนที่เหลือให้ทุกคนดู
            const pending = room.turnManager.getPendingPlayers();
            io.to(roomId).emit('waiting_update', {
                pendingPlayers: pending
            });
        }
    });

    socket.on('send_proximity_msg', ({ roomId, message }) => {
        const room = allRooms.get(roomId);
        const sender = room?.players.get(socket.id);

        if (room && sender) {
            // 🔍 หาเพื่อนคนอื่นที่อยู่พิกัดเดียวกัน
            const peopleInRoom = Array.from(room.players.values()).filter(
                p => p.pos.x === sender.pos.x && p.pos.y === sender.pos.y
            );

            // 📢 ส่งข้อความหาทุกคนในกลุ่มนั้น (รวมตัวเอง)
            peopleInRoom.forEach(p => {
                io.to(p.id).emit('receive_proximity_msg', {
                    senderName: sender.name,
                    message: message,
                    time: new Date().toLocaleTimeString()
                });
            });
        }
    });
};