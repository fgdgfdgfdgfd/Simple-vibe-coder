const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Data file paths
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users/users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games/games.json');
const MODELS_FILE = path.join(DATA_DIR, 'models/models.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends/friends.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat/global.json');

// Ensure data directories exist
[USERS_FILE, GAMES_FILE, MODELS_FILE, FRIENDS_FILE, CHAT_FILE].forEach(file => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([], null, 2));
});

// Helper functions for JSON file operations
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// In-memory stores
const rooms = new Map();
const players = new Map();
const activeGames = new Map();

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  const users = readJSON(USERS_FILE);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    avatar: 'default',
    skin: 'default',
    friends: [],
    createdAt: new Date()
  };
  
  users.push(user);
  writeJSON(USERS_FILE, users);
  
  res.json({ userId: user.id, username: user.username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ userId: user.id, username: user.username, avatar: user.avatar, skin: user.skin });
});

app.get('/api/user/:id', (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({ 
    id: user.id, 
    username: user.username, 
    avatar: user.avatar, 
    skin: user.skin,
    friends: user.friends 
  });
});

// Game routes
app.get('/api/games', (req, res) => {
  const games = readJSON(GAMES_FILE);
  res.json(games.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    creatorId: g.creatorId,
    creatorName: g.creatorName,
    isPublic: g.isPublic,
    playerCount: activeGames.has(g.id) ? activeGames.get(g.id).players.length : 0,
    thumbnail: g.thumbnail
  })));
});

app.post('/api/games', (req, res) => {
  const { name, description, creatorId, creatorName, isPublic, script } = req.body;
  const game = {
    id: uuidv4(),
    name,
    description: description || '',
    creatorId,
    creatorName,
    isPublic: isPublic !== false,
    script: script || '',
    objects: [],
    thumbnail: '/assets/default-game.png',
    createdAt: new Date()
  };
  
  const games = readJSON(GAMES_FILE);
  games.push(game);
  writeJSON(GAMES_FILE, games);
  
  res.json({ gameId: game.id });
});

app.get('/api/games/:id', (req, res) => {
  const games = readJSON(GAMES_FILE);
  const game = games.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

app.put('/api/games/:id', (req, res) => {
  const games = readJSON(GAMES_FILE);
  const index = games.findIndex(g => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Game not found' });
  
  games[index] = { ...games[index], ...req.body };
  writeJSON(GAMES_FILE, games);
  
  res.json({ success: true });
});

app.delete('/api/games/:id', (req, res) => {
  let games = readJSON(GAMES_FILE);
  games = games.filter(g => g.id !== req.params.id);
  writeJSON(GAMES_FILE, games);
  res.json({ success: true });
});

// Marketplace routes (all free)
app.get('/api/marketplace/skins', (req, res) => {
  const skins = [
    { id: 'default', name: 'Default', color: '#ffffff' },
    { id: 'red', name: 'Red Hero', color: '#ff0000' },
    { id: 'blue', name: 'Blue Knight', color: '#0000ff' },
    { id: 'green', name: 'Green Ranger', color: '#00ff00' },
    { id: 'yellow', name: 'Yellow Star', color: '#ffff00' },
    { id: 'purple', name: 'Purple Magic', color: '#800080' },
    { id: 'orange', name: 'Orange Flash', color: '#ffa500' },
    { id: 'black', name: 'Black Ninja', color: '#000000' },
    { id: 'gold', name: 'Gold Legend', color: '#ffd700' },
    { id: 'rainbow', name: 'Rainbow', color: 'rainbow' }
  ];
  res.json(skins);
});

app.post('/api/user/equip-skin', (req, res) => {
  const { userId, skinId } = req.body;
  const users = readJSON(USERS_FILE);
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  
  users[index].skin = skinId;
  writeJSON(USERS_FILE, users);
  
  res.json({ success: true, skin: skinId });
});

// Toolbox routes
app.get('/api/toolbox/models', (req, res) => {
  const models = readJSON(MODELS_FILE);
  res.json(models);
});

app.post('/api/toolbox/models', (req, res) => {
  const { name, description, creatorId, creatorName, objects, isPublic } = req.body;
  const model = {
    id: uuidv4(),
    name,
    description: description || '',
    creatorId,
    creatorName,
    isPublic: isPublic !== false,
    objects: objects || [],
    downloads: 0,
    createdAt: new Date()
  };
  
  const models = readJSON(MODELS_FILE);
  models.push(model);
  writeJSON(MODELS_FILE, models);
  
  res.json({ modelId: model.id });
});

// Friends routes
app.get('/api/friends/:userId', (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const friendUsers = users.filter(u => user.friends.includes(u.id)).map(u => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    online: !!players.has(u.id)
  }));
  
  res.json(friendUsers);
});

app.post('/api/friends/add', (req, res) => {
  const { userId, friendId } = req.body;
  const users = readJSON(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === userId);
  const friendIndex = users.findIndex(u => u.id === friendId);
  
  if (userIndex === -1 || friendIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!users[userIndex].friends.includes(friendId)) {
    users[userIndex].friends.push(friendId);
    writeJSON(USERS_FILE, users);
  }
  
  res.json({ success: true });
});

// Chat routes
app.get('/api/chat/global', (req, res) => {
  const messages = readJSON(CHAT_FILE);
  res.json(messages.slice(-50)); // Last 50 messages
});

app.post('/api/chat/global', (req, res) => {
  const { userId, username, message } = req.body;
  const messages = readJSON(CHAT_FILE);
  
  messages.push({
    id: uuidv4(),
    userId,
    username,
    message,
    timestamp: new Date()
  });
  
  // Keep only last 100 messages
  if (messages.length > 100) messages.shift();
  writeJSON(CHAT_FILE, messages);
  
  io.emit('global-chat-message', { userId, username, message, timestamp: new Date() });
  res.json({ success: true });
});

// Socket.io handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join-game', (data) => {
    const { gameId, userId, username } = data;
    
    if (!activeGames.has(gameId)) {
      const games = readJSON(GAMES_FILE);
      const game = games.find(g => g.id === gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      activeGames.set(gameId, { game, players: [], objects: [...(game.objects || [])] });
    }
    
    const gameData = activeGames.get(gameId);
    const player = {
      id: socket.id,
      userId,
      username,
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0 }
    };
    
    players.set(socket.id, { ...player, gameId });
    gameData.players.push(player);
    socket.join(gameId);
    
    socket.emit('game-joined', { 
      gameId, 
      playerId: socket.id,
      players: gameData.players,
      objects: gameData.objects,
      script: gameData.game.script
    });
    
    socket.to(gameId).emit('player-joined', { player });
  });

  socket.on('player-move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      socket.to(player.gameId).emit('player-moved', {
        playerId: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  socket.on('create-object', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const gameData = activeGames.get(player.gameId);
    if (!gameData) return;
    
    const object = {
      id: uuidv4(),
      type: data.type,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale || { x: 1, y: 1, z: 1 },
      color: data.color || '#ffffff',
      creatorId: socket.id
    };
    
    gameData.objects.push(object);
    io.to(player.gameId).emit('object-created', { object });
  });

  socket.on('delete-object', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const gameData = activeGames.get(player.gameId);
    if (!gameData) return;
    
    gameData.objects = gameData.objects.filter(obj => obj.id !== data.objectId);
    io.to(player.gameId).emit('object-deleted', { objectId: data.objectId });
  });

  socket.on('game-chat-message', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    io.to(player.gameId).emit('game-chat-message', {
      playerId: socket.id,
      playerName: player.username,
      message: data.message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player && activeGames.has(player.gameId)) {
      const gameData = activeGames.get(player.gameId);
      gameData.players = gameData.players.filter(p => p.id !== socket.id);
      
      // Save game state
      const games = readJSON(GAMES_FILE);
      const gameIndex = games.findIndex(g => g.id === player.gameId);
      if (gameIndex !== -1) {
        games[gameIndex].objects = gameData.objects;
        writeJSON(GAMES_FILE, games);
      }
      
      if (gameData.players.length === 0) {
        activeGames.delete(player.gameId);
      } else {
        socket.to(player.gameId).emit('player-left', { playerId: socket.id });
      }
    }
    players.delete(socket.id);
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in browser`);
});
