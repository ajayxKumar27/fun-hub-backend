// ============================================================================
// Gaming Backend Server - Express + Socket.io
// Handles real-time game state synchronization and text chat
// ============================================================================

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS enabled for frontend connection
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server + alternative
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active game rooms with their players
const gameRooms = new Map();

// ============================================================================
// REST Endpoints
// ============================================================================

app.get('/', (req, res) => {
  res.send('Gaming Backend Server is running on port 5000');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is healthy', timestamp: new Date() });
});

// ============================================================================
// Socket.io Event Handlers
// ============================================================================

io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.id}`);

  // Emit connection confirmation to client
  socket.emit('connection_response', {
    status: 'connected',
    socketId: socket.id,
    message: 'Successfully connected to gaming server',
  });

  // ========================================================================
  // EVENT: Create or Join a Game Room
  // ========================================================================
  socket.on('join_room', (data) => {
    const { roomId, playerName } = data;

    // Validate input
    if (!roomId || !playerName) {
      socket.emit('join_room_response', {
        status: 'error',
        message: 'Room ID and player name are required',
      });
      return;
    }

    // Remove player from previous room if connected to one
    if (socket.rooms.size > 1) {
      const previousRoom = Array.from(socket.rooms).find((room) => room !== socket.id);
      socket.leave(previousRoom);
      console.log(`  Removed ${socket.id} from previous room: ${previousRoom}`);
    }

    // Initialize room if it doesn't exist
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        players: [],
        gameState: null,
        createdAt: new Date(),
      });
      console.log(`  Created new game room: ${roomId}`);
    }

    // Add player to room
    socket.join(roomId);

    const room = gameRooms.get(roomId);
    room.players.push({
      socketId: socket.id,
      name: playerName,
      joinedAt: new Date(),
    });

    console.log(`  ${playerName} joined room ${roomId}. Total players: ${room.players.length}`);

    // Notify all players in room about the new player
    io.to(roomId).emit('player_joined', {
      roomId,
      players: room.players,
      message: `${playerName} has joined the room`,
      playerCount: room.players.length,
    });

    // Confirm to the joining player
    socket.emit('join_room_response', {
      status: 'success',
      roomId,
      players: room.players,
      message: `You have joined room ${roomId}`,
    });
  });

  // ========================================================================
  // EVENT: Send Text Message in Game Room
  // ========================================================================
  socket.on('send_message', (data) => {
    const { roomId, playerName, message } = data;

    if (!roomId || !message) {
      socket.emit('message_response', {
        status: 'error',
        message: 'Room ID and message content are required',
      });
      return;
    }

    const room = gameRooms.get(roomId);
    if (!room) {
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

    // Broadcast message to all players in the room (including sender)
    io.to(roomId).emit('receive_message', messageData);
  });

  // ========================================================================
  // EVENT: Player Disconnect
  // ========================================================================
  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.id}`);

    // Find and remove player from all rooms
    gameRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(
        (player) => player.socketId === socket.id
      );

      if (playerIndex !== -1) {
        const removedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        console.log(`  Removed ${removedPlayer.name} from room ${roomId}`);

        // Notify remaining players
        if (room.players.length > 0) {
          io.to(roomId).emit('player_left', {
            roomId,
            players: room.players,
            message: `${removedPlayer.name} has left the room`,
            playerCount: room.players.length,
          });
        } else {
          // Delete empty room
          gameRooms.delete(roomId);
          console.log(`  Deleted empty room: ${roomId}`);
        }
      }
    });
  });

  // ========================================================================
  // EVENT: Explicit Leave Room (optional, for better UX)
  // ========================================================================
  socket.on('leave_room', (data) => {
    const { roomId, playerName } = data;

    if (!roomId) {
      socket.emit('leave_room_response', {
        status: 'error',
        message: 'Room ID is required',
      });
      return;
    }

    const room = gameRooms.get(roomId);
    if (!room) {
      socket.emit('leave_room_response', {
        status: 'error',
        message: `Room ${roomId} does not exist`,
      });
      return;
    }

    socket.leave(roomId);

    // Remove player from room data
    const playerIndex = room.players.findIndex(
      (player) => player.socketId === socket.id
    );
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      console.log(`  ${playerName} left room ${roomId}`);
    }

    // Notify remaining players
    if (room.players.length > 0) {
      io.to(roomId).emit('player_left', {
        roomId,
        players: room.players,
        message: `${playerName} has left the room`,
        playerCount: room.players.length,
      });
    } else {
      gameRooms.delete(roomId);
      console.log(`  Deleted empty room: ${roomId}`);
    }

    socket.emit('leave_room_response', {
      status: 'success',
      message: `You have left room ${roomId}`,
    });
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Gaming Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🔗 Frontend should connect to http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
