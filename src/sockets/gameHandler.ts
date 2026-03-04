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

        room.players.forEach((player) => {
            room.turnManager.addPlayer(player);
            const startRoom = room.map[player.pos.y][player.pos.x];
            io.to(player.id).emit('game_started', {
                yourPos: player.pos,
                roomNumber: startRoom.id,
                doors: startRoom.doors
            });
        });
    });

    socket.on('player_move', ({ roomId, targetPos }) => {
        const room = allRooms.get(roomId);
        if (!room || !room.turnManager) return;

        const isReady = room.turnManager.submitMove(socket.id, targetPos);
        if (isReady) {
            const turnData = room.turnManager.processTurn();
            turnData.results.forEach((res: any) => io.to(res.playerId).emit('turn_result', res));
        }
    });
};