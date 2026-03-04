import type { GameMap } from "../types/GameMap.js";
import type { Room } from "../types/Room.js";

export class GameManager {
    private map: GameMap;

    constructor(map: GameMap) {
        this.map = map;
    }

    public relocateAnswerRoom(): void {
        // 1. หาตำแหน่งห้องตอบคำถามปัจจุบัน
        let currentPos: { x: number; y: number } | null = null;
        const allRooms: Room[] = [];

        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                allRooms.push(this.map[y][x]);
                if (this.map[y][x].isAnswerRoom) {
                    currentPos = { x, y };
                    this.map[y][x].isAnswerRoom = false; // ปิดห้องเดิม
                }
            }
        }

        // 2. สุ่มหาที่อยู่ใหม่ที่ไม่ซ้ำที่เดิม
        const possibleRooms = allRooms.filter(
            (r) => !(r.x === currentPos?.x && r.y === currentPos?.y)
        );
        const newRoom = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];

        newRoom.isAnswerRoom = true; // เปิดห้องใหม่
        console.log(`🌀 Answer Room warped to: [${newRoom.x}, ${newRoom.y}]`);
    }

    public handleItemPickup(x: number, y: number, answerCorrect: boolean): string | null {
        const room = this.map[y][x];
        if (room.item.type && !room.item.isCollected) {
            if (answerCorrect) {
                room.item.isCollected = true;
                return room.item.type; // คืนค่าประเภทไอเทมที่ได้รับ
            } else {
                // ถ้าตอบผิด ไอเทมจะ "ละลายหายไป" ตามกติกาในคลิป
                room.item.isCollected = true;
                return null;
            }
        }
        return null;
    }

    public checkPlayerDeath(playerPos: { x: number, y: number }, devilPos: { x: number, y: number }): boolean {
        return playerPos.x === devilPos.x && playerPos.y === devilPos.y;
    }

    public checkProximity(playerPos: { x: number, y: number }, targetPos: { x: number, y: number }): boolean {
        const dx = Math.abs(playerPos.x - targetPos.x);
        const dy = Math.abs(playerPos.y - targetPos.y);

        // ระยะห่างไม่เกิน 1 ช่องในทุกทิศทาง แต่ต้องไม่ใช่ห้องเดียวกัน
        return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
    }

    public getRoomNumber(x: number, y: number): number {
        // ตรวจสอบก่อนว่าพิกัดอยู่ในขอบเขต 0-5 หรือไม่
        if (y >= 0 && y < 6 && x >= 0 && x < 6) {
            const row = this.map[y]; // แถวคือ y
            if (row && row[x]) {
                return row[x].id;
            }
        }
        console.error(`❌ Invalid Coordinate: x=${x}, y=${y}`);
        return 0; // คืนค่า default ถ้าหาไม่เจอ
    }
}