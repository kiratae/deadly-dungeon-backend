import type { GameMap } from "../types/GameMap.js";
import type { Direction } from "../types/Direction.js";

export class DevilManager {
    private pos: { x: number; y: number };
    private map: GameMap;

    constructor(map: GameMap) {
        this.map = map;
        // สุ่มจุดเกิดของปีศาจ (แนะนำให้เกิดห่างจากผู้เล่นหน่อย)
        this.pos = {
            x: Math.floor(Math.random() * 6),
            y: Math.floor(Math.random() * 6)
        };
    }

    // Logic: ปีศาจขยับ 1 ก้าว
    public move(): { x: number; y: number } {
        const currentRoom = this.map[this.pos.y][this.pos.x];
        const possibleMoves: Direction[] = [];

        // เช็กว่าประตูบานไหนเปิดอยู่บ้าง
        if (currentRoom.doors.N) possibleMoves.push('N');
        if (currentRoom.doors.E) possibleMoves.push('E');
        if (currentRoom.doors.S) possibleMoves.push('S');
        if (currentRoom.doors.W) possibleMoves.push('W');

        if (possibleMoves.length > 0) {
            // สุ่มเลือกทิศทางจากประตูที่เปิดอยู่
            const chosenDir = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

            if (chosenDir === 'N') this.pos.y--;
            if (chosenDir === 'E') this.pos.x++;
            if (chosenDir === 'S') this.pos.y++;
            if (chosenDir === 'W') this.pos.x--;
        }

        console.log(`👹 Devil moved to: [${this.pos.x}, ${this.pos.y}]`);
        return { ...this.pos };
    }

    public getPosition() {
        return { ...this.pos };
    }
}