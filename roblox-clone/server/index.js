const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Хранилище игровых комнат
const rooms = new Map();
// Хранилище игроков
const players = new Map();

app.use(express.static('../client'));
app.use(express.json());

// API для создания игры
app.post('/api/create-room', (req, res) => {
  const roomId = uuidv4();
  rooms.set(roomId, {
    id: roomId,
    name: req.body.name || 'Room ' + roomId.substring(0, 6),
    players: [],
    objects: [],
    createdAt: new Date()
  });
  res.json({ roomId });
});

// API для получения списка комнат
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.length
  }));
  res.json(roomList);
});

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  // Игрок присоединяется к комнате
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    const room = rooms.get(roomId);
    const player = {
      id: socket.id,
      name: playerName,
      roomId,
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0 },
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    players.set(socket.id, player);
    room.players.push(player);
    
    socket.join(roomId);
    socket.emit('room-joined', { 
      roomId, 
      playerId: socket.id,
      players: room.players 
    });

    // Уведомляем других игроков в комнате
    socket.to(roomId).emit('player-joined', { player });

    // Отправляем текущие объекты комнаты
    socket.emit('room-objects', { objects: room.objects });
  });

  // Обновление позиции игрока
  socket.on('player-move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      
      socket.to(player.roomId).emit('player-moved', {
        playerId: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  // Создание объекта в комнате
  socket.on('create-object', (data) => {
    const player = players.get(socket.id);
    if (!player || !rooms.has(player.roomId)) return;

    const room = rooms.get(player.roomId);
    const object = {
      id: uuidv4(),
      type: data.type, // 'cube', 'sphere', 'platform'
      position: data.position,
      rotation: data.rotation,
      scale: data.scale || { x: 1, y: 1, z: 1 },
      color: data.color || '#ffffff',
      creatorId: socket.id
    };

    room.objects.push(object);
    
    io.to(player.roomId).emit('object-created', { object });
  });

  // Удаление объекта
  socket.on('delete-object', (data) => {
    const player = players.get(socket.id);
    if (!player || !rooms.has(player.roomId)) return;

    const room = rooms.get(player.roomId);
    room.objects = room.objects.filter(obj => obj.id !== data.objectId);
    
    io.to(player.roomId).emit('object-deleted', { objectId: data.objectId });
  });

  // Чат
  socket.on('chat-message', (data) => {
    const player = players.get(socket.id);
    if (!player || !rooms.has(player.roomId)) return;

    io.to(player.roomId).emit('chat-message', {
      playerId: socket.id,
      playerName: player.name,
      message: data.message,
      timestamp: new Date()
    });
  });

  // Игрок отключается
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player && rooms.has(player.roomId)) {
      const room = rooms.get(player.roomId);
      room.players = room.players.filter(p => p.id !== socket.id);
      
      // Удаляем комнату если нет игроков
      if (room.players.length === 0) {
        rooms.delete(player.roomId);
      } else {
        socket.to(player.roomId).emit('player-left', { playerId: socket.id });
      }
    }
    players.delete(socket.id);
    console.log('Игрок отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});
