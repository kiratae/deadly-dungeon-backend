import type { DevilManager } from "../core/DevilManager.js";
import type { GameManager } from "../core/GameManager.js";
import type { TurnManager } from "../core/TurnManager.js";
import type { GameMap } from "./GameMap.js";
import type { Player } from "./Player.js";

export interface RoomState {
    roomId: string;
    hostId: string;
    gameStarted: boolean;
    map: GameMap;
    gameManager: GameManager;
    devilManager: DevilManager;
    turnManager: TurnManager;
    players: Map<string, Player>;
}