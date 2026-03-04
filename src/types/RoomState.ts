import type { Player } from "./Player.js";

export interface RoomState {
    roomId: string;
    hostId: string;
    gameStarted: boolean;
    map: any;
    gameManager: any;
    devilManager: any;
    turnManager: any;
    players: Map<string, Player>;
}