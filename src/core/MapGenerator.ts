import type { GameMap } from "../types/GameMap.js";
import type { ItemType } from "../types/ItemType.js";
import type { Room } from "../types/Room.js";

export class MapGenerator {
    private size = 6;

    generate(): GameMap {
        const grid: GameMap = [];

        for (let y = 0; y < this.size; y++) {
            grid[y] = [];
            for (let x = 0; x < this.size; x++) {
                grid[y][x] = {
                    id: 0, // placeholder, จะถูกแทนที่ด้วยเลขจริงหลังจากวางห้องตัน
                    x, y,
                    isBlocked: false,
                    doors: { N: false, E: false, S: false, W: false },
                    isAnswerRoom: false,
                    item: { type: null, isCollected: false }
                };
            }
        }

        let blockedCount = 0;
        const targetBlocked = Math.floor(Math.random() * 3) + 4; // 4-6 ห้อง
        while (blockedCount < targetBlocked) {
            const rx = Math.floor(Math.random() * this.size);
            const ry = Math.floor(Math.random() * this.size);

            // เงื่อนไขการวาง: 
            // - ต้องไม่ซ้ำห้องเดิม
            // - ต้องไม่ทำให้ห้องข้างเคียงถูกตัดขาด (Isolate)
            if (!grid[ry][rx].isBlocked && this.canPlaceBlock(grid, rx, ry)) {
                grid[ry][rx].isBlocked = true;
                blockedCount++;
            }
        }

        const actualRoomCount = (this.size * this.size) - blockedCount;
        const numbers = Array.from({ length: actualRoomCount }, (_, i) => i + 1);
        this.shuffle(numbers); // สลับเลขให้กระจายทั่วแมพ

        // 4. แจกจ่ายเลข ID ให้เฉพาะห้องที่ไม่ใช่ห้องตัน
        let numIdx = 0;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (!grid[y][x].isBlocked) {
                    grid[y][x].id = numbers[numIdx++];
                }
            }
        }

        this.establishDoors(grid);

        this.assignSpecialRooms(grid);

        this.printDebugMap(grid);

        return grid;
    }

    private establishDoors(grid: any[][]) {
        const visited = new Set<string>();
        const nonBlockedRooms: { x: number, y: number }[] = [];

        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                if (!grid[y][x].isBlocked) nonBlockedRooms.push({ x, y });
            }
        }

        if (nonBlockedRooms.length === 0) return;

        // --- จังหวะที่ 1: เชื่อมกลุ่มหลัก ---
        const start = nonBlockedRooms[0];
        visited.add(`${start.x}-${start.y}`);

        let changed = true;
        while (changed) {
            changed = false;
            for (const room of nonBlockedRooms) {
                if (!visited.has(`${room.x}-${room.y}`)) continue;

                const neighbors = this.getValidNeighbors(grid, room.x, room.y)
                    .filter(n => !visited.has(`${n.x}-${n.y}`));

                if (neighbors.length > 0) {
                    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.connectRooms(grid, room.x, room.y, next.x, next.y, next.dir);
                    visited.add(`${next.x}-${next.y}`);
                    changed = true;
                }
            }
        }

        // --- จังหวะที่ 2: เจาะเกาะร้าง (Bridge Islands) ---
        // ถ้ายังมีห้องที่ยังไม่โดน Visit (อย่างเช่น 23 หรือ 12 ในเคสของคุณ)
        for (const room of nonBlockedRooms) {
            if (!visited.has(`${room.x}-${room.y}`)) {
                // บังคับเชื่อมห้องนี้เข้ากับ "ใครก็ได้" ที่อยู่ข้างๆ (แม้จะเป็นทิศที่ไปหาห้องตันก็ตาม)
                // แต่จะดีกว่าถ้าสุ่มหาทิศที่ไปหาห้องที่ Visit แล้ว
                this.forceBridgeToMain(grid, room.x, room.y, visited);
                visited.add(`${room.x}-${room.y}`);
            }
        }

        // --- จังหวะที่ 3: เพิ่มทางลัด (Extra Loops) ---
        nonBlockedRooms.forEach(room => {
            const neighbors = this.getValidNeighbors(grid, room.x, room.y);
            neighbors.forEach(n => {
                if (!grid[room.y][room.x].doors[n.dir] && Math.random() > 0.8) {
                    this.connectRooms(grid, room.x, room.y, n.x, n.y, n.dir);
                }
            });
        });
    }

    private forceBridgeToMain(grid: any[][], x: number, y: number, visited: Set<string>) {
        const dirs = [
            { x: 0, y: -1, dir: 'N' }, { x: 0, y: 1, dir: 'S' },
            { x: 1, y: 0, dir: 'E' }, { x: -1, y: 0, dir: 'W' }
        ].sort(() => Math.random() - 0.5);

        for (const d of dirs) {
            const nx = x + d.x;
            const ny = y + d.y;
            // พยายามเชื่อมกับห้องที่ไม่ Block และถูก Visit แล้วก่อน
            if (nx >= 0 && nx < 6 && ny >= 0 && ny < 6 && !grid[ny][nx].isBlocked) {
                this.connectRooms(grid, x, y, nx, ny, d.dir);
                return; // เชื่อมได้แล้วออกเลย
            }
        }
    }

    // ฟังก์ชันช่วยหาห้องข้างๆ ที่ไม่ Blocked
    private getValidNeighbors(grid: GameMap, x: number, y: number) {
        const dirs = [
            { x: 0, y: -1, dir: 'N' }, { x: 0, y: 1, dir: 'S' },
            { x: 1, y: 0, dir: 'E' }, { x: -1, y: 0, dir: 'W' }
        ];
        return dirs
            .map(d => ({ x: x + d.x, y: y + d.y, dir: d.dir }))
            .filter(n => n.x >= 0 && n.x < this.size && n.y >= 0 && n.y < this.size && !grid[n.y][n.x].isBlocked);
    }

    // ฟังก์ชันช่วยเชื่อมประตู 2 ฝั่ง
    private connectRooms(grid: any[][], x1: number, y1: number, x2: number, y2: number, dir: string) {
        const opp = { 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E' }[dir];
        grid[y1][x1].doors[dir] = true;
        grid[y2][x2].doors[opp as any] = true;
    }

    private assignSpecialRooms(grid: GameMap = []) {
        // 1. รวบรวมรายชื่อห้องทั้งหมดที่ไม่ใช่ห้องตัน (isBlocked: false)
        const availableRooms: Room[] = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (!grid[y][x].isBlocked) {
                    availableRooms.push(grid[y][x]);
                }
            }
        }

        this.shuffleRooms(availableRooms);

        // 3. สุ่มห้องคำตอบ (Answer Room / Golden Room) - 1 ห้อง
        if (availableRooms.length > 0) {
            const answerRoom = availableRooms.pop();
            if (answerRoom)
                answerRoom.isAnswerRoom = true;
        }

        // 4. สุ่มห้องไอเทม (Item Room) - สุ่มประมาณ 4 ห้อง
        const itemCount = Math.min(this.size, availableRooms.length); // ป้องกันกรณีห้องว่างไม่พอ
        for (let i = 0; i < itemCount; i++) {
            const itemRoom = availableRooms.pop();
            if (itemRoom)
                itemRoom.item = { type: this.randomItemType(), isCollected: false };
        }
    }

    private shuffleRooms(array: Room[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
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
        if (Math.random() > 0.35) return null;
        const types: ItemType[] = ['REVIVE', 'TRAP', 'MOVE_X2', 'SCANNER'];
        return types[Math.floor(Math.random() * types.length)];
    }

    private canPlaceBlock(grid: any[][], x: number, y: number): boolean {
        const neighbors = [
            { x, y: y - 1 }, { x, y: y + 1 },
            { x: x + 1, y }, { x: x - 1, y }
        ];

        for (const n of neighbors) {
            // ตรวจสอบเฉพาะเพื่อนบ้านที่เป็น "ห้องปกติ" (ไม่โดนบล็อก)
            if (n.x >= 0 && n.x < 6 && n.y >= 0 && n.y < 6 && !grid[n.y][n.x].isBlocked) {
                // นับว่าเพื่อนบ้านคนนี้ เหลือทางออกกี่ทาง (ไม่นับจุดที่เรากำลังจะวาง XX)
                const air = this.countAvailableAir(grid, n.x, n.y, x, y);
                if (air === 0) return false; // ถ้าวางแล้วเพื่อนบ้านจะถูกปิดตาย ห้ามวาง!
            }
        }
        return true;
    }

    // 🌬️ ฟังก์ชันนับทางเดินรอบห้องนั้นๆ
    private countAvailableAir(grid: any[][], x: number, y: number, skipX: number, skipY: number): number {
        let air = 0;
        const neighbors = [
            { x, y: y - 1 }, { x, y: y + 1 },
            { x: x + 1, y }, { x: x - 1, y }
        ];

        for (const n of neighbors) {
            if (n.x >= 0 && n.x < 6 && n.y >= 0 && n.y < 6) {
                // ข้ามจุดที่เรา "กำลังจะวาง XX" (skipX, skipY)
                if (n.x === skipX && n.y === skipY) continue;
                // ถ้าช่องข้างๆ ไม่ใช่ห้องตัน นับเป็น 1 Air
                if (!grid[n.y][n.x].isBlocked) air++;
            }
        }
        return air;
    }

    public printDebugMap(grid: GameMap) {
        console.log("\n--- 🗺️ DUNGEON DEBUG MAP ---");

        let visualMap = "";

        for (let y = 0; y < this.size; y++) {
            let rowLine = "";    // สำหรับแสดง [ID] และประตู E
            let connectLine = ""; // สำหรับแสดงประตู S

            for (let x = 0; x < this.size; x++) {
                const room = grid[y][x];
                const isBlocked = room.isBlocked;
                const idText = isBlocked ? "XX" : room.id.toString().padStart(2, '0');
                const isSpecial = room.isAnswerRoom ? "*" : room.item?.type ? room.item?.type.substring(0, 1).toUpperCase() : " ";

                rowLine += `[${idText}${isSpecial}]${room.doors.E ? "—" : " "}`;

                // 2. วาดประตูทิศใต้ (S)
                //  |   ถ้าประตูเปิด,      ถ้าประตูปิด
                connectLine += `${room.doors.S ? "  |  " : "     "} `;
            }

            visualMap += rowLine + "\n";
            visualMap += connectLine + "\n";
        }

        console.log(visualMap);
        console.log("----------------------------\n");
    }
}