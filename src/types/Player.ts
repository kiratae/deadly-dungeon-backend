export interface Player {
  id: string;        // Socket ID
  name: string;
  pos: { x: number; y: number };
  isAlive: boolean;
  hasMoved: boolean; // เช็กว่าในเทิร์นนี้เดินหรือยัง
  pendingMove: { x: number; y: number } | null; // เก็บพิกัดที่เลือกเดินไว้ก่อนประมวลผล
}