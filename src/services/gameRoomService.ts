// ============================================================================
// Game Room Service
// Manages all game room operations and player management
// ============================================================================

export interface Player {
  socketId: string;
  name: string;
  joinedAt: Date;
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: unknown;
  createdAt: Date;
}

class GameRoomService {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(roomId: string): GameRoom {
    const room: GameRoom = {
      id: roomId,
      players: [],
      gameState: null,
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  addPlayerToRoom(roomId: string, player: Player): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.players.push(player);
    return true;
  }

  removePlayerFromRoom(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const index = room.players.findIndex((p) => p.socketId === socketId);
    if (index === -1) return false;

    room.players.splice(index, 1);
    return true;
  }

  getRoomPlayers(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    return room ? room.players : [];
  }

  getPlayerCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room ? room.players.length : 0;
  }

  updateGameState(roomId: string, state: unknown): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.gameState = state;
    return true;
  }

  getGameState(roomId: string): unknown {
    const room = this.rooms.get(roomId);
    return room ? room.gameState : null;
  }

  getRoomStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalPlayers: 0,
      rooms: Array.from(this.rooms.values()).map((room) => ({
        id: room.id,
        players: room.players.length,
        createdAt: room.createdAt,
      })),
    };

    stats.totalPlayers = stats.rooms.reduce((sum, room) => sum + room.players, 0);
    return stats;
  }
}

export const gameRoomService = new GameRoomService();
