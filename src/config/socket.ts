// ============================================================================
// Socket.io Configuration Module
// Centralizes all Socket.io setup and event handlers
// ============================================================================

import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { gameRoomService } from '../services/gameRoomService.js';

export function configureSocket(httpServer: HTTPServer, clientUrl: string) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ========================================================================
  // Connection Handler
  // ========================================================================

  io.on('connection', (socket) => {
    console.log(`✓ User connected: ${socket.id}`);

    socket.emit('connection_response', {
      status: 'connected',
      socketId: socket.id,
      message: 'Successfully connected to gaming server',
    });

    // ====================================================================
    // Join Room Event
    // ====================================================================

    socket.on('join_room', (data) => {
      const { roomId, playerName } = data;

      if (!roomId || !playerName) {
        socket.emit('join_room_response', {
          status: 'error',
          message: 'Room ID and player name are required',
        });
        return;
      }

      // Leave previous room if exists
      if (socket.rooms.size > 1) {
        const previousRoom = Array.from(socket.rooms).find((room) => room !== socket.id);
        socket.leave(previousRoom as string);
        console.log(`  Removed ${socket.id} from previous room: ${previousRoom}`);
      }

      // Create or get room
      if (!gameRoomService.roomExists(roomId)) {
        gameRoomService.createRoom(roomId);
        console.log(`  Created new game room: ${roomId}`);
      }

      // Join socket to room
      socket.join(roomId);

      // Add player to room
      gameRoomService.addPlayerToRoom(roomId, {
        socketId: socket.id,
        name: playerName,
        joinedAt: new Date(),
      });

      const players = gameRoomService.getRoomPlayers(roomId);

      console.log(`  ${playerName} joined room ${roomId}. Total players: ${players.length}`);

      // Broadcast to all players in room
      io.to(roomId).emit('player_joined', {
        roomId,
        players,
        message: `${playerName} has joined the room`,
        playerCount: players.length,
      });

      socket.emit('join_room_response', {
        status: 'success',
        roomId,
        players,
        message: `You have joined room ${roomId}`,
      });
    });

    // ====================================================================
    // Send Message Event
    // ====================================================================

    socket.on('send_message', (data) => {
      const { roomId, playerName, message } = data;

      if (!roomId || !message) {
        socket.emit('message_response', {
          status: 'error',
          message: 'Room ID and message content are required',
        });
        return;
      }

      if (!gameRoomService.roomExists(roomId)) {
        socket.emit('message_response', {
          status: 'error',
          message: `Room ${roomId} does not exist`,
        });
        return;
      }

      const messageData = {
        senderId: socket.id,
        senderName: playerName,
        content: message,
        timestamp: new Date(),
        roomId,
      };

      console.log(`  [${roomId}] ${playerName}: ${message}`);

      io.to(roomId).emit('receive_message', messageData);
    });

    // ====================================================================
    // Leave Room Event
    // ====================================================================

    socket.on('leave_room', (data) => {
      const { roomId, playerName } = data;

      if (!roomId) {
        socket.emit('leave_room_response', {
          status: 'error',
          message: 'Room ID is required',
        });
        return;
      }

      if (!gameRoomService.roomExists(roomId)) {
        socket.emit('leave_room_response', {
          status: 'error',
          message: `Room ${roomId} does not exist`,
        });
        return;
      }

      socket.leave(roomId);
      gameRoomService.removePlayerFromRoom(roomId, socket.id);

      const players = gameRoomService.getRoomPlayers(roomId);

      console.log(`  ${playerName} left room ${roomId}`);

      if (players.length > 0) {
        io.to(roomId).emit('player_left', {
          roomId,
          players,
          message: `${playerName} has left the room`,
          playerCount: players.length,
        });
      } else {
        gameRoomService.deleteRoom(roomId);
        console.log(`  Deleted empty room: ${roomId}`);
      }

      socket.emit('leave_room_response', {
        status: 'success',
        message: `You have left room ${roomId}`,
      });
    });

    // ====================================================================
    // Game Start Event (Tic-Tac-Toe)
    // ====================================================================

    socket.on('game_start', (data) => {
      const { roomId, playerName, gameType } = data;

      if (!roomId || !gameType) {
        return;
      }

      // Get all players in room
      const players = gameRoomService.getRoomPlayers(roomId);

      // Only emit when both players are present
      if (players.length < 2) {
        console.log(`  ⏳ Waiting for opponent in room ${roomId}...`);
        return;
      }

      console.log(`  🎮 Game ready in room ${roomId}. Players: ${players.map(p => p.name).join(', ')}`);

      // Assign symbols: First player = X, Second player = O
      // (X always goes first in Tic-Tac-Toe)
      const gameStartData = {
        gameType,
        players: players.map((p, idx) => ({
          name: p.name,
          socketId: p.socketId,
          symbol: idx === 0 ? 'X' : 'O',
        })),
      };

      // Send first player their symbol (X)
      io.to(players[0].socketId).emit('game_start', {
        ...gameStartData,
        playerSymbol: 'X',
      });
      console.log(`    📤 Sent symbol 'X' to ${players[0].name}`);

      // Send second player their symbol (O)
      io.to(players[1].socketId).emit('game_start', {
        ...gameStartData,
        playerSymbol: 'O',
      });
      console.log(`    📤 Sent symbol 'O' to ${players[1].name}`);
    });

    // ====================================================================
    // Game Move Event (Tic-Tac-Toe)
    // ====================================================================

    socket.on('game_move', (data) => {
      const { roomId, playerName, board, playerSymbol } = data;

      if (!roomId || !board) {
        return;
      }

      console.log(`  📍 ${playerName} (${playerSymbol}) moved in ${roomId}`);

      // Broadcast move to opponent(s)
      socket.to(roomId).emit('game_move', {
        board,
        playerSymbol,
        playerName,
      });
    });

    // ====================================================================
    // Game Reset Event (Tic-Tac-Toe)
    // ====================================================================

    socket.on('game_reset', (data) => {
      const { roomId, playerName } = data;

      if (!roomId) {
        return;
      }

      console.log(`  🔄 Game reset in room ${roomId} by ${playerName}`);

      // Broadcast reset to all players
      socket.to(roomId).emit('game_reset', {
        playerName,
      });
    });

    // ====================================================================
    // Disconnect Event
    // ====================================================================

    socket.on('disconnect', () => {
      console.log(`✗ User disconnected: ${socket.id}`);

      // Remove player from all rooms
      const allRooms = gameRoomService.getAllRooms();

      allRooms.forEach((room: any) => {
        const player = room.players.find((p: any) => p.socketId === socket.id);

        if (player) {
          gameRoomService.removePlayerFromRoom(room.id, socket.id);
          const remainingPlayers = gameRoomService.getRoomPlayers(room.id);

          console.log(`  Removed ${player.name} from room ${room.id}`);

          if (remainingPlayers.length > 0) {
            io.to(room.id).emit('player_left', {
              roomId: room.id,
              players: remainingPlayers,
              message: `${player.name} has left the room`,
              playerCount: remainingPlayers.length,
            });
          } else {
            gameRoomService.deleteRoom(room.id);
            console.log(`  Deleted empty room: ${room.id}`);
          }
        }
      });
    });
  });

  return io;
}
