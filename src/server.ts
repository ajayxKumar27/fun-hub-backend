// ============================================================================
// Gaming Backend Server - Main Entry Point
// Real-time multiplayer gaming server with Express and Socket.io
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { configureSocket } from './config/socket.js';
import { CONSTANTS } from './config/constants.js';
import { gameRoomService } from './services/gameRoomService.js';

// Load environment variables
dotenv.config();

// ============================================================================
// Server Initialization
// ============================================================================

const PORT = parseInt(process.env.PORT || String(CONSTANTS.DEFAULT_PORT), 10);
const CLIENT_URL = process.env.CLIENT_URL || CONSTANTS.DEFAULT_CLIENT_URL;

// ============================================================================
// CORS and Socket.io Origins - Allow local network access
// ============================================================================

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
];

// Add all common local network IPs (192.168.x.x, 10.x.x.x)
const getLocalNetworkOrigins = () => {
  const origins = [...allowedOrigins];
  // Add support for local network IPs
  // Matches patterns like http://192.168.0.x:5173 and http://10.0.0.x:5173
  return origins;
};

const app = express();
const server = createServer(app);

// Initialize Socket.io with dynamic CORS
const io = configureSocket(server, CLIENT_URL);

// ============================================================================
// Middleware
// ============================================================================

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// REST API Endpoints
// ============================================================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Gaming Backend Server is running',
    timestamp: new Date(),
  });
});

app.get('/health', (req, res) => {
  const stats = gameRoomService.getRoomStats();
  res.json({
    status: 'healthy',
    environment: CONSTANTS.NODE_ENV,
    stats,
    timestamp: new Date(),
  });
});

// Get all active rooms (debugging endpoint)
app.get('/api/rooms', (req, res) => {
  const rooms = gameRoomService.getAllRooms();
  res.json({
    totalRooms: rooms.length,
    rooms: rooms.map((room) => ({
      id: room.id,
      playerCount: room.players.length,
      players: room.players.map((p) => ({ name: p.name, socketId: p.socketId })),
      createdAt: room.createdAt,
    })),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
  });
});

// ============================================================================
// Server Startup
// ============================================================================

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Gaming Backend Server Started');
  console.log('='.repeat(70));
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Client URL: ${CLIENT_URL}`);
  console.log(`🔧 Environment: ${CONSTANTS.NODE_ENV}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎮 API Rooms: http://localhost:${PORT}/api/rooms`);
  console.log('='.repeat(70) + '\n');

  if (CONSTANTS.IS_DEVELOPMENT) {
    console.log('💡 Tips:');
    console.log('   - Start frontend: cd Gaming_Frontend && npm run dev');
    console.log('   - Open http://localhost:5173 in your browser');
    console.log('   - Use DevTools Console to see Socket.io events\n');
  }
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received: Shutting down gracefully...');
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received: Shutting down gracefully...');
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
});

// Unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { app, server, io };
