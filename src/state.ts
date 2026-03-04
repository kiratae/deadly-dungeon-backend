import type { RoomState } from './types/RoomState.js';

// เก็บทุกห้องไว้ที่นี่เพื่อให้ Handlers ต่างๆ เรียกใช้ได้
export const allRooms = new Map<string, RoomState>();