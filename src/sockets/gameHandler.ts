import { Server, Socket } from 'socket.io';
import { allRooms } from '../state.js';
import { MapGenerator } from '../core/MapGenerator.js';
import { GameManager } from '../core/GameManager.js';
import { DevilManager } from '../core/DevilManager.js';
import { TurnManager } from '../core/TurnManager.js';

const readyPlayers = new Map<string, Set<string>>();

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
        for (let y = 0; y < room.map.length; y++) {
            for (let x = 0; x < room.map[y].length; x++) {
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

    socket.on('player_move', ({ roomId, direction }) => {
        const room = allRooms.get(roomId);
        if (!room || !room.turnManager) return;
        const sender = room?.players.get(socket.id);

        const isReady = room.turnManager.submitMove(socket.id, direction);

        if (sender && sender.hasMoved && sender.pendingMove) {
            const nextRoom = room.map[sender.pendingMove.y][sender.pendingMove.x];
            io.to(socket.id).emit('move_result', {
                nextRoom: nextRoom.id,
                doors: nextRoom.doors,
                item: nextRoom.item.type,
                isAnswerRoom: nextRoom.isAnswerRoom
            });
        }

        if (isReady) {
            // 🏁 ทุกคนเดินครบ -> ประมวลผล
            const turnData = room.turnManager.processTurn();
            const currentTurn = room.turnManager.getTurnNumber();

            const nextTurnPending = room.turnManager.getPendingPlayers();

            turnData.results.forEach((res: any) => {
                io.to(res.playerId).emit('turn_result', {
                    ...res,
                    turnNumber: currentTurn,
                    pendingPlayers: nextTurnPending,
                    turnProcessed: true
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

    socket.on("submit_final_map", ({ roomId, submittedMap }) => {
        const room = allRooms.get(roomId);
        if (!room || !room.gameManager) return;

        const isCorrect = room.gameManager.verifyMap(submittedMap);

        if (isCorrect) {
            // 🏆 ประกาศผู้ชนะให้ทุกคนในห้องรู้
            const winner = room.players.get(socket.id);
            io.to(roomId).emit("game_over", {
                status: "WIN",
                winnerName: winner?.name,
                message: `${winner?.name} คือผู้รอดชีวิตที่แท้จริง! รับเงินรางวัล 70,000!`
            });
        } else {
            // 💀 ตอบผิด: ผู้เล่นคนนั้นตาย และวาร์ปห้องหนี
            const player = room.players.get(socket.id);
            if (player) player.isAlive = false;

            room.gameManager.relocateAnswerRoom();

            socket.emit("turn_result", { status: "DIED", message: "คุณตอบผิด และวิญญาณของคุณถูกกักขัง..." });
            io.to(roomId).emit("broadcast_message", `${player?.name} ตอบผิดและเสียชีวิตแล้ว! ห้องคำถามได้ย้ายที่ไปแล้ว...`);
        }
    });

    socket.on('ready_for_next_turn', ({ roomId }) => {
        const room = allRooms.get(roomId);
        if (!room) return;

        if (!readyPlayers.has(roomId)) {
            readyPlayers.set(roomId, new Set());
        }

        const roomReadySet = readyPlayers.get(roomId)!;
        roomReadySet.add(socket.id);

        // เช็กว่าทุกคนกด Ready หรือยัง
        const alivePlayers = Array.from(room.players.values());

        console.log(`${roomReadySet.size} out of ${alivePlayers.length} players in room ${roomId} are ready for the next turn.`);

        if (roomReadySet.size >= alivePlayers.length) {
            // ล้างสถานะ Ready สำหรับเทิร์นถัดไป
            readyPlayers.delete(roomId);

            console.log(`All players in room ${roomId} are ready for the next turn. Starting next turn...`);

            // 🚀 สั่งเริ่มเทิร์นถัดไปอย่างเป็นทางการ
            io.to(roomId).emit('start_next_turn', {
                turnNumber: room.turnManager.getTurnNumber(),
                pendingPlayers: alivePlayers.map(p => p.name)
            });

            // อย่าลืมรีเซ็ต hasMoved ของทุกคนใน backend ด้วย
            room.players.forEach(p => p.hasMoved = false);
        } else {
            // แจ้งเตือนคนอื่นๆ ว่ามีคน Ready เพิ่มขึ้น
            io.to(roomId).emit('waiting_ready', {
                readyCount: roomReadySet.size,
                totalCount: alivePlayers.length
            });
        }
    });
};