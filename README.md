# Gaming Backend Server

Real-time multiplayer gaming backend built with Node.js, Express, and Socket.io.

## Features

- Express.js server on port 5000
- Socket.io for real-time communication
- Game room management
- Real-time chat messaging
- Player connection tracking
- CORS enabled for frontend communication

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## Running the Server

### Development Mode (with live reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Watch TypeScript Changes
```bash
npm run build:watch
```

## Project Structure

```
Gaming_Backend/
├── src/
│   ├── server.ts           # Main server file
│   ├── config/
│   │   ├── socket.ts       # Socket.io configuration
│   │   └── constants.ts    # App constants
│   └── services/
│       └── gameRoomService.ts  # Game room logic
├── dist/                   # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

- `GET /` - Server health check
- `GET /health` - Detailed health status

## Socket.io Events

### Client → Server
- `join_room` - Join a specific game room
- `send_message` - Send chat message to room
- `leave_room` - Leave current room

### Server → Client
- `connection_response` - Confirmation of connection
- `join_room_response` - Response to room join attempt
- `player_joined` - Notification when player joins
- `receive_message` - Incoming chat message
- `player_left` - Notification when player leaves

## License

ISC
