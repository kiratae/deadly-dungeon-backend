import { describe, it, expect, beforeEach } from 'vitest';
import { MapGenerator } from './MapGenerator.js';

describe('MapGenerator', () => {
  let generator: MapGenerator;

  beforeEach(() => {
    generator = new MapGenerator();
  });

  it('ควรสร้างแมพที่มีขนาด 6x6 (36 ห้อง)', () => {
    const map = generator.generate();
    expect(map.length).toBe(6);
    expect(map[0].length).toBe(6);
    
    const allRooms = map.flat();
    expect(allRooms.length).toBe(36);
  });

  it('ต้องมีห้องตอบคำถาม (Answer Room) เพียงห้องเดียวเท่านั้น', () => {
    const map = generator.generate();
    const answerRooms = map.flat().filter(room => room.isAnswerRoom);
    
    expect(answerRooms.length).toBe(1);
  });

  it('ประตูระหว่างห้องต้องเชื่อมต่อกันอย่างถูกต้อง (Consistency)', () => {
    const map = generator.generate();
    
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const current = map[y][x];

        // เช็กประตูทิศตะวันออก (E) กับ ทิศตะวันตก (W) ของห้องถัดไป
        if (x < 5) {
          const neighbor = map[y][x + 1];
          expect(current.doors.E).toBe(neighbor.doors.W);
        }

        // เช็กประตูทิศใต้ (S) กับ ทิศเหนือ (N) ของห้องถัดไป
        if (y < 5) {
          const neighbor = map[y + 1][x];
          expect(current.doors.S).toBe(neighbor.doors.N);
        }
      }
    }
  });
});