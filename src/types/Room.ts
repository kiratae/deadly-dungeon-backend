import type { Direction } from "./Direction.js";
import type { ItemType } from "./ItemType.js";

export interface Room {
    id: number;
    x: number;
    y: number;
    doors: { [key in Direction]: boolean };
    isAnswerRoom: boolean;
    item: {
        type: ItemType;
        isCollected: boolean;
    };
}