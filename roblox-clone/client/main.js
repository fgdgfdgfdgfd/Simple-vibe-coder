import * as THREE from 'three';
import { Socket } from 'socket.io-client';

// Глобальные переменные
let scene, camera, renderer;
let socket;
let playerId = null;
let currentRoomId = null;
let playerName = '';
let currentTool = 'move';
let players = {};
let objects = [];
let raycaster, mouse;
let isGameActive = false;

// Инициализация Three.js
function initThree() {
  const container = document.getElementById('canvas-container');
  
  // Сцена
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

  // Камера
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Свет
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Земля
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a7d3a,
    side: THREE.DoubleSide
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Сетка на земле
  const gridHelper = new THREE.GridHelper(100, 10, 0x000000, 0x000000);
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Raycaster для взаимодействия
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Обработчики событий
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('keydown', onKeyDown);

  // Запуск цикла рендеринга
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  if (!isGameActive) return;
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
  if (!isGameActive || currentTool === 'move') return;
  
  if (currentTool === 'delete') {
    deleteObject();
  } else {
    createObject();
  }
}

function onKeyDown(event) {
  if (!isGameActive) return;
  
  const speed = 0.1;
  const playerMesh = players[playerId]?.mesh;
  
  if (!playerMesh) return;

  switch(event.key.toLowerCase()) {
    case 'w':
      playerMesh.position.z -= speed;
      break;
    case 's':
      playerMesh.position.z += speed;
      break;
    case 'a':
      playerMesh.position.x -= speed;
      break;
    case 'd':
      playerMesh.position.x += speed;
      break;
    case ' ':
      playerMesh.position.y += speed;
      break;
    case 'shift':
      playerMesh.position.y -= speed;
      break;
  }

  // Отправка позиции на сервер
  if (socket && playerMesh) {
    socket.emit('player-move', {
      position: {
        x: playerMesh.position.x,
        y: playerMesh.position.y,
        z: playerMesh.position.z
      },
      rotation: {
        x: playerMesh.rotation.x,
        y: playerMesh.rotation.y
      }
    });
  }
}

function createObject() {
  raycaster.setFromCamera(mouse, camera);
  
  // Получаем позицию для создания объекта
  const intersects = raycaster.intersectObjects(scene.children);
  
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const color = document.getElementById('color-picker').value;
    
    const objectData = {
      type: currentTool,
      position: {
        x: Math.round(point.x),
        y: Math.round(point.y + 0.5),
        z: Math.round(point.z)
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: color
    };

    if (socket) {
      socket.emit('create-object', objectData);
    }
  }
}

function deleteObject() {
  raycaster.setFromCamera(mouse, camera);
  
  const objectMeshes = objects.map(obj => obj.mesh);
  const intersects = raycaster.intersectObjects(objectMeshes);
  
  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const object = objects.find(obj => obj.mesh === mesh);
    
    if (object && socket) {
      socket.emit('delete-object', { objectId: object.id });
    }
  }
}

// Socket.io функции
function connectSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Подключено к серверу');
  });

  socket.on('room-joined', (data) => {
    console.log('Присоединился к комнате:', data.roomId);
    currentRoomId = data.roomId;
    playerId = data.playerId;
    
    // Создаем меш игрока
    createPlayerMesh(playerId, { x: 0, y: 1, z: 0 }, playerName);
    
    // Добавляем других игроков
    data.players.forEach(player => {
      if (player.id !== playerId) {
        createPlayerMesh(player.id, player.position, player.name);
      }
    });

    // Показываем HUD
    showHUD();
  });

  socket.on('player-joined', (data) => {
    console.log('Игрок присоединился:', data.player.name);
    createPlayerMesh(data.player.id, data.player.position, data.player.name);
    addChatMessage(`${data.player.name} присоединился к игре`);
  });

  socket.on('player-left', (data) => {
    console.log('Игрок покинул игру');
    removePlayerMesh(data.playerId);
    addChatMessage('Игрок покинул игру');
  });

  socket.on('player-moved', (data) => {
    const player = players[data.playerId];
    if (player && player.mesh) {
      player.mesh.position.set(data.position.x, data.position.y, data.position.z);
    }
  });

  socket.on('room-objects', (data) => {
    data.objects.forEach(obj => {
      addObjectToScene(obj);
    });
  });

  socket.on('object-created', (data) => {
    addObjectToScene(data.object);
  });

  socket.on('object-deleted', (data) => {
    removeObjectFromScene(data.objectId);
  });

  socket.on('chat-message', (data) => {
    addChatMessage(`${data.playerName}: ${data.message}`);
  });

  socket.on('error', (data) => {
    alert('Ошибка: ' + data.message);
  });
}

function createPlayerMesh(id, position, name) {
  const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
  const material = new THREE.MeshStandardMaterial({ 
    color: Math.random() * 0xffffff 
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  
  // Добавляем имя над игроком
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  context.font = 'Bold 32px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.fillText(name, 128, 40);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(0, 1.5, 0);
  sprite.scale.set(2, 0.5, 1);
  mesh.add(sprite);

  scene.add(mesh);
  players[id] = { mesh, name };

  if (id === playerId) {
    // Это наш игрок - следим камерой
    camera.position.set(position.x, position.y + 3, position.z + 5);
    camera.lookAt(position.x, position.y, position.z);
  }
}

function removePlayerMesh(id) {
  const player = players[id];
  if (player) {
    scene.remove(player.mesh);
    delete players[id];
  }
}

function addObjectToScene(objectData) {
  let geometry;
  
  switch(objectData.type) {
    case 'cube':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.5, 16, 16);
      break;
    case 'platform':
      geometry = new THREE.BoxGeometry(2, 0.2, 2);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  const material = new THREE.MeshStandardMaterial({ 
    color: objectData.color 
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    objectData.position.x,
    objectData.position.y,
    objectData.position.z
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);
  objects.push({ id: objectData.id, mesh, data: objectData });
}

function removeObjectFromScene(objectId) {
  const index = objects.findIndex(obj => obj.id === objectId);
  if (index !== -1) {
    const obj = objects[index];
    scene.remove(obj.mesh);
    objects.splice(index, 1);
  }
}

// UI функции
window.createRoom = async function() {
  const nameInput = document.getElementById('player-name');
  playerName = nameInput.value.trim() || 'Player';
  
  try {
    const response = await fetch('/api/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName + "'s Room" })
    });
    
    const data = await response.json();
    joinRoom(data.roomId);
  } catch (error) {
    alert('Ошибка создания комнаты: ' + error.message);
  }
};

window.joinRoom = function(roomId) {
  const nameInput = document.getElementById('player-name');
  playerName = nameInput.value.trim() || 'Player';
  
  socket.emit('join-room', {
    roomId: roomId,
    playerName: playerName
  });
};

window.refreshRooms = async function() {
  try {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();
    
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = '';
    
    if (rooms.length === 0) {
      roomList.innerHTML = '<div style="padding: 12px; text-align: center; color: #999;">Нет активных комнат</div>';
      return;
    }
    
    rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <span><strong>${room.name}</strong></span>
        <span style="color: #667eea;">${room.playerCount} игроков</span>
      `;
      div.onclick = () => joinRoom(room.id);
      roomList.appendChild(div);
    });
  } catch (error) {
    console.error('Ошибка загрузки комнат:', error);
  }
};

window.selectTool = function(tool) {
  currentTool = tool;
  
  // Обновляем активную кнопку
  document.querySelectorAll('.tool-button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
};

window.leaveRoom = function() {
  if (socket) {
    socket.disconnect();
  }
  resetGame();
};

window.handleChatKeyPress = function(event) {
  if (event.key === 'Enter' && socket) {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
      socket.emit('chat-message', { message });
      input.value = '';
    }
  }
};

function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.textContent = message;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showHUD() {
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('hud').style.display = 'block';
  document.getElementById('display-name').textContent = playerName;
  document.getElementById('room-id-display').textContent = currentRoomId.substring(0, 8) + '...';
  isGameActive = true;
}

function hideHUD() {
  document.getElementById('main-menu').classList.remove('hidden');
  document.getElementById('hud').style.display = 'none';
  isGameActive = false;
}

function resetGame() {
  // Очищаем сцену от игроков и объектов
  Object.keys(players).forEach(id => {
    removePlayerMesh(id);
  });
  
  objects.forEach(obj => {
    scene.remove(obj.mesh);
  });
  objects = [];
  players = {};
  
  currentRoomId = null;
  playerId = null;
  isGameActive = false;
  
  hideHUD();
  
  // Сбрасываем камеру
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
  
  refreshRooms();
}

function animate() {
  requestAnimationFrame(animate);
  
  // Обновляем камеру для нашего игрока
  if (playerId && players[playerId]) {
    const playerMesh = players[playerId].mesh;
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + 5;
    camera.position.y = playerMesh.position.y + 3;
    camera.lookAt(playerMesh.position);
  }
  
  renderer.render(scene, camera);
}

// Инициализация при загрузке
initThree();
connectSocket();
refreshRooms();
