import { describe, it, expect } from 'vitest';
import { MapGenerator } from './MapGenerator.js';
import { DevilManager } from './DevilManager.js';

describe('DevilManager', () => {
    it('ปีศาจต้องเดินผ่านประตูที่เปิดอยู่เท่านั้น', () => {
        const map = new MapGenerator().generate();
        const devil = new DevilManager(map);

        const startPos = devil.getPosition();
        const currentRoom = map[startPos.y][startPos.x];

        const newPos = devil.move();

        // ตรวจสอบว่าทิศทางที่ปีศาจไป มีประตูเปิดอยู่จริง
        if (newPos.y < startPos.y) expect(currentRoom.doors.N).toBe(true);
        if (newPos.x > startPos.x) expect(currentRoom.doors.E).toBe(true);
        if (newPos.y > startPos.y) expect(currentRoom.doors.S).toBe(true);
        if (newPos.x < startPos.x) expect(currentRoom.doors.W).toBe(true);
    });
});