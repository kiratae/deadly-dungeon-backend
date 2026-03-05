import type { Player } from '../types/Player.js';
import { GameManager } from './GameManager.js';
import { DevilManager } from './DevilManager.js';

export class TurnManager {
    private players: Map<string, Player> = new Map();
    private gameManager: GameManager;
    private devilManager: DevilManager;
    private turnNumber: number = 1;

    constructor(gameManager: GameManager, devilManager: DevilManager) {
        this.gameManager = gameManager;
        this.devilManager = devilManager;
    }

    public getTurnNumber() {
        return this.turnNumber;
    }

    public getPendingPlayers(): string[] {
        return Array.from(this.players.values())
            .filter(p => p.isAlive && !p.hasMoved)
            .map(p => p.name);
    }

    public addPlayer(player: Player) {
        this.players.set(player.id, player);
    }

    // รับคำสั่งเดินจากผู้เล่น [00:04:18]
    public submitMove(playerId: string, direction: string): boolean {
        const player = this.players.get(playerId);
        if (player && player.isAlive && !player.hasMoved) {

            const nextPos = { ...player.pos };
            if (direction === "N") nextPos.y--;
            if (direction === "S") nextPos.y++;
            if (direction === "E") nextPos.x++;
            if (direction === "W") nextPos.x--;

            console.log(`Player ${player.name} move from (${player.pos.x}, ${player.pos.y}) to (${nextPos.x}, ${nextPos.y})`);
            player.pendingMove = nextPos;
            player.hasMoved = true;
        }
        return this.isTurnReady();
    }

    // เช็กว่าทุกคน (ที่ยังมีชีวิต) เดินครบหรือยัง
    private isTurnReady(): boolean {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
        return alivePlayers.every(p => p.hasMoved);
    }

    // ประมวลผลเทิร์น (The Magic Happens Here) [00:12:57]
    public processTurn() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);

        // 1. ย้ายตำแหน่งผู้เล่นจริงตามที่เลือกไว้
        alivePlayers.forEach(p => {
            if (p.pendingMove) {
                p.pos = p.pendingMove;
                p.pendingMove = null;
                p.hasMoved = false; // รีเซ็ตสำหรับเทิร์นหน้า
            }
        });

        // 2. ปีศาจเดินต่อทันที [00:13:06]
        const devilPos = this.devilManager.move();

        // 3. เช็กผลลัพธ์หลังเดินเสร็จ
        const results = alivePlayers.map(player => {
            if (!player.pos) {
                console.error(`Player ${player.name} has no position!`);
                return { playerId: player.id, status: 'ERROR' };
            }

            // เช็กตาย (ชนปีศาจ) 
            if (this.gameManager.checkPlayerDeath(player.pos, devilPos)) {
                player.isAlive = false;
                return { playerId: player.id, status: 'DIED', pos: player.pos };
            }

            // เช็กเสียงกึกกัก (ปีศาจอยู่ใกล้ 8 ทิศ)
            const heardNoise = this.gameManager.checkProximity(player.pos, devilPos);

            // เช็กการเจอเพื่อน (จ๊ะเอ๋กัน)
            const metPlayers = alivePlayers
                .filter(other => other.id !== player.id && other.pos.x === player.pos.x && other.pos.y === player.pos.y)
                .map(other => other.name);

            const roomNo = this.gameManager.getRoomNumber(player.pos.x, player.pos.y);

            return {
                playerId: player.id,
                status: 'ALIVE',
                pos: player.pos,
                roomNumber: roomNo,
                heardNoise,
                metPlayers
            };
        });

        this.turnNumber++;
        return { results, devilPos };
    }
}