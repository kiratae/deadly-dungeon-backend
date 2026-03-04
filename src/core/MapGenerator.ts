import type { GameMap } from "../types/GameMap.js";
import type { ItemType } from "../types/ItemType.js";

export class MapGenerator {
    private size = 6;

    generate(): GameMap {
        // 1. สร้างเลขห้อง 1-36 และสุ่มลำดับ
        const numbers = Array.from({ length: 36 }, (_, i) => i + 1);
        this.shuffle(numbers);

        // 2. เตรียม Grid เปล่าๆ
        const grid: GameMap = [];
        let numIdx = 0;

        // 1. สร้างโครงสร้างพื้นฐาน 6x6 และใส่เลขห้องลงไป
        for (let y = 0; y < this.size; y++) {
            grid[y] = [];
            for (let x = 0; x < this.size; x++) {
                grid[y][x] = {
                    id: numbers[numIdx++],
                    x, y,
                    doors: { N: false, E: false, S: false, W: false },
                    isAnswerRoom: false,
                    item: { type: this.randomItemType(), isCollected: false } // สุ่มใส่ไอเทมลงไปเลย
                };
            }
        }

        this.establishDoors(grid);

        // 4. สุ่มห้องตอบคำถาม (Answer Room)
        const randomY = Math.floor(Math.random() * 6);
        const randomX = Math.floor(Math.random() * 6);
        grid[randomY][randomX].isAnswerRoom = true;

        return grid;
    }

    private establishDoors(grid: GameMap) {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (x < this.size - 1) {
                    const open = Math.random() > 0.4;
                    grid[y][x].doors.E = open;
                    grid[y][x + 1].doors.W = open;
                }
                if (y < this.size - 1) {
                    const open = Math.random() > 0.4;
                    grid[y][x].doors.S = open;
                    grid[y + 1][x].doors.N = open;
                }
            }
        }
    }

    private shuffle(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // สุ่มประเภทไอเทม (โอกาส 20% ที่ห้องนั้นจะมีไอเทม)
    private randomItemType(): ItemType {
        if (Math.random() > 0.2) return null;
        const types: ItemType[] = ['REVIVE', 'TRAP', 'MOVE_X2', 'SCANNER'];
        return types[Math.floor(Math.random() * types.length)];
    }
}