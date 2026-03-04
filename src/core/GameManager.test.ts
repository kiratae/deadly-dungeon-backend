import { describe, it, expect } from 'vitest';
import { MapGenerator } from './MapGenerator.js';
import { GameManager } from './GameManager.js';

describe('GameManager - Warp Logic', () => {
  it('ควรย้ายตำแหน่ง Answer Room เมื่อสั่ง relocateAnswerRoom', () => {
    const map = new MapGenerator().generate();
    const manager = new GameManager(map);

    // หาตำแหน่งเดิม
    const oldPos = map.flat().find(r => r.isAnswerRoom);
    const oldCoords = { x: oldPos?.x, y: oldPos?.y };

    // สั่งวาร์ป
    manager.relocateAnswerRoom();

    // หาตำแหน่งใหม่
    const newPos = map.flat().find(r => r.isAnswerRoom);

    expect(newPos).toBeDefined(); // ต้องยังมีห้องอยู่
    expect(newPos?.x === oldCoords.x && newPos?.y === oldCoords.y).toBe(false); // ต้องไม่ใช่ที่เดิม
  });
});