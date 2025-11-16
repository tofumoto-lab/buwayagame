const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreText = document.getElementById('scoreText');
const bestText = document.getElementById('bestText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const difficultySelect = document.getElementById('difficulty');
const obstaclesToggle = document.getElementById('obstaclesToggle');
const eventBadge = document.getElementById('eventBadge');

const sndEat = document.getElementById('sndEat');
const sndStart = document.getElementById('sndStart');
const sndGameOver = document.getElementById('sndGameOver');
const bgm = document.getElementById('bgm');

const gridSizeDefault = 20; // base tile size in px (we'll adjust per difficulty)
let gridSize = gridSizeDefault;
let tileCountX = Math.floor(canvas.width / gridSize);
let tileCountY = Math.floor(canvas.height / gridSize);

/* Images */
const headImage = new Image();
const foodImage = new Image();
const goldFoodImage = new Image();

// Placeholder file names — replace with your images
headImage.src = 'buwaya2.png';
foodImage.src = 'money.png';
goldFoodImage.src = 'money_gold.png';

/* Game state */
let snake = [];
let dx = 1, dy = 0;
let score = 0;
let bestScore = Number(localStorage.getItem('buwaya_best') || 0);
bestText.textContent = `₱${bestScore}B`;
let food = null;
let goldenFood = null; // for events
let moveInterval = null;
let gameRunning = false;
let paused = false;
let speedMs = 120;
let obstacles = [];
let obstacleCount = 4;
let eventActive = null; // 'double' or 'gold'
let eventTimer = 0;

/* Animation helpers */
let frameCounter = 0;
let headPulse = 0; // for breathing effect

/* Utility */
function tileRandom(maxX = tileCountX, maxY = tileCountY){
  return {
    x: Math.floor(Math.random() * maxX),
    y: Math.floor(Math.random() * maxY)
  };
}

/* ----------------------------
   Difficulty settings
   ---------------------------- */
function applyDifficulty() {
  const d = difficultySelect.value;
  switch(d){
    case 'easy': speedMs = 160; gridSize = 24; obstacleCount = 2; break;
    case 'normal': speedMs = 110; gridSize = 20; obstacleCount = 4; break;
    case 'hard': speedMs = 85; gridSize = 16; obstacleCount = 6; break;
    case 'insane': speedMs = 60; gridSize = 12; obstacleCount = 10; break;
    default: speedMs = 110; gridSize = 20; obstacleCount = 4;
  }
  tileCountX = Math.floor(canvas.width / gridSize);
  tileCountY = Math.floor(canvas.height / gridSize);
}

/* ----------------------------
   Initialize / Reset game
   ---------------------------- */
function resetGameState() {
  applyDifficulty();
  snake = [{ x: Math.floor(tileCountX/2), y: Math.floor(tileCountY/2) }];
  dx = 1; dy = 0;
  score = 0;
  eventActive = null;
  eventTimer = 0;
  obstacles = [];

  if (obstaclesToggle.checked) {
    for (let i=0;i<obstacleCount;i++){
      const o = tileRandom();
      // ensure not on snake start
      if (o.x === snake[0].x && o.y === snake[0].y) { i--; continue; }
      obstacles.push(o);
    }
  }

  placeFood();
  placeGoldenFood(); // may or may not be used during events
  updateScoreText();
  eventBadge.textContent = 'No Event';
}

/* Place normal food ensuring it doesn't collide with snake or obstacles */
function placeFood() {
  let f = tileRandom();
  while (snake.some(s => s.x === f.x && s.y === f.y) ||
         obstacles.some(o => o.x === f.x && o.y === f.y) ||
         (goldenFood && goldenFood.x === f.x && goldenFood.y === f.y)) {
    f = tileRandom();
  }
  food = f;
}

/* Golden food (rare) */
function placeGoldenFood() {
  if (Math.random() < 0.15) { // 15% chance to spawn as initial
    let g = tileRandom();
    while (snake.some(s => s.x === g.x && s.y === g.y) ||
           obstacles.some(o => o.x === g.x && o.y === g.y) ||
           (food && food.x === g.x && food.y === g.y)) {
      g = tileRandom();
    }
    goldenFood = g;
  } else {
    goldenFood = null;
  }
}

/* ----------------------------
   Rendering
   ---------------------------- */
function drawRoundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  // background
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#001212';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // grid glow
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#00ff66';
  for (let gx = 0; gx < tileCountX; gx++){
    for (let gy = 0; gy < tileCountY; gy++){
      // subtle glow box (very faint)
      ctx.fillRect(gx*gridSize+1, gy*gridSize+1, gridSize-2, gridSize-2);
    }
  }
  ctx.restore();

  // obstacles
  ctx.save();
  ctx.fillStyle = '#550000';
  obstacles.forEach(o => {
    ctx.fillStyle = '#331111';
    drawRoundedRect(o.x*gridSize+2, o.y*gridSize+2, gridSize-4, gridSize-4, 4);
    // inner hazard glow
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(o.x*gridSize+3, o.y*gridSize+3, gridSize-6, gridSize-6);
    ctx.globalAlpha = 1;
  });
  ctx.restore();

  // snake body (from tail to head)
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const sx = seg.x * gridSize, sy = seg.y * gridSize;
    if (i === 0) continue; // head drawn later
    ctx.save();
    // fade tail effect
    const fade = 0.4 + 0.6 * (i / Math.max(1, snake.length));
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#00ff88';
    drawRoundedRect(sx+2, sy+2, gridSize-4, gridSize-4, 4);
    ctx.restore();
  }

  // animated head (rotate based on direction + breathing)
  const head = snake[0];
  const hx = head.x * gridSize, hy = head.y * gridSize;
  headPulse = Math.sin(frameCounter * 0.18) * 0.06 + 1.0; // breathing scale
  const headSize = (gridSize - 4) * headPulse;

  ctx.save();
  ctx.translate(hx + gridSize/2, hy + gridSize/2);
  let angle = 0;
  if (dx === 1) angle = 0;
  if (dx === -1) angle = Math.PI;
  if (dy === -1) angle = -Math.PI/2;
  if (dy === 1) angle = Math.PI/2;
  ctx.rotate(angle);
  // draw head image if loaded, else fallback colored rect
  if (headImage.complete && headImage.naturalWidth !== 0) {
    ctx.drawImage(headImage, -headSize/2, -headSize/2, headSize, headSize);
  } else {
    ctx.fillStyle = '#00ff66';
    drawRoundedRect(-headSize/2, -headSize/2, headSize, headSize, 6);
  }
  ctx.restore();

  // draw normal food with bob + spin animation
  if (food) {
    const fx = food.x * gridSize + gridSize/2;
    const fy = food.y * gridSize + gridSize/2;
    const bob = Math.sin(frameCounter * 0.25) * 4;
    const spin = (frameCounter * 0.06) % (Math.PI*2);

    ctx.save();
    ctx.translate(fx, fy + bob);
    ctx.rotate(spin);
    const fsize = gridSize - 6;
    if (foodImage.complete && foodImage.naturalWidth !== 0) {
      ctx.drawImage(foodImage, -fsize/2, -fsize/2, fsize, fsize);
    } else {
      ctx.fillStyle = '#ffd700';
      drawRoundedRect(-fsize/2, -fsize/2, fsize, fsize, 6);
    }
    ctx.restore();
  }

  // golden food (rare) — add glow + star
  if (goldenFood) {
    const gx = goldenFood.x * gridSize + gridSize/2;
    const gy = goldenFood.y * gridSize + gridSize/2;
    const bob = Math.cos(frameCounter * 0.35) * 6;
    ctx.save();
    ctx.translate(gx, gy + bob);
    const gsize = gridSize - 2;
    // glow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.arc(0,0,gsize*0.9,0,Math.PI*2);
    ctx.fill();
    // draw image or fallback
    if (goldFoodImage.complete && goldFoodImage.naturalWidth !== 0) {
      ctx.drawImage(goldFoodImage, -gsize/2, -gsize/2, gsize, gsize);
    } else {
      ctx.fillStyle = '#ffd700';
      drawRoundedRect(-gsize/2, -gsize/2, gsize, gsize, 6);
    }
    ctx.restore();
  }

  // overlay HUD small grid or border
  ctx.save();
  ctx.strokeStyle = 'rgba(0,255,102,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,canvas.width-1,canvas.height-1);
  ctx.restore();
}

/* ----------------------------
   Game logic: movement & collision
   ---------------------------- */
function step() {
  if (!gameRunning || paused) return;

  // move head
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  // wrap
  head.x = (head.x + tileCountX) % tileCountX;
  head.y = (head.y + tileCountY) % tileCountY;

  // move obstacles (optional small random drift)
  if (obstaclesToggle.checked && Math.random() < 0.1) {
    obstacles.forEach((o, idx) => {
      if (Math.random() < 0.12) {
        const dir = Math.floor(Math.random()*4);
        const nx = (o.x + (dir===0?1:dir===1?-1:0) + tileCountX) % tileCountX;
        const ny = (o.y + (dir===2?1:dir===3?-1:0) + tileCountY) % tileCountY;
        // don't move into snake head
        if (!(nx === head.x && ny === head.y)) {
          o.x = nx; o.y = ny;
        }
      }
    });
  }

  snake.unshift(head);

  // check collisions: obstacles
  if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
    return endGame();
  }

  // check self-collision
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return endGame();
    }
  }

  // eat golden food first (bigger reward)
  if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
    score += 5; // golden = +5
    playSound(sndEat);
    goldenFood = null;
    // spawn multiple foods as reward
    for (let i=0;i<2;i++) placeFood();
    updateScoreText();
    maybeTriggerEvent(); // new random event
    // tail not removed -> growth
  } else if (food && head.x === food.x && head.y === food.y) {
    const gained = (eventActive === 'double') ? 2 : 1;
    score += gained;
    playSound(sndEat);
    // spawn next
    placeFood();
    // small chance to spawn golden food rarely
    if (Math.random() < 0.12) placeGoldenFood();
    updateScoreText();
    // do not pop tail -> snake grows
  } else {
    // normal move: remove last segment
    snake.pop();
  }

  // event timer handling
  if (eventActive) {
    eventTimer--;
    if (eventTimer <= 0) {
      eventActive = null;
      eventBadge.textContent = 'No Event';
    }
  }
}

/* ----------------------------
   Event system (random bonuses)
   ---------------------------- */
function maybeTriggerEvent() {
  // small chance to trigger a timed event after eating
  const r = Math.random();
  if (r < 0.08) {
    // double money for 12 steps
    eventActive = 'double';
    eventTimer = Math.floor(12 + Math.random()*12);
    eventBadge.textContent = 'DOUBLE ₱ (x2)';
  } else if (r >= 0.08 && r < 0.14) {
    eventActive = 'gold';
    eventTimer = Math.floor(8 + Math.random()*10);
    eventBadge.textContent = 'GOLDEN RAIN';
    // spawn a golden food immediately
    placeGoldenFood();
  }
}

/* ----------------------------
   End game
   ---------------------------- */
function endGame() {
  gameRunning = false;
  clearInterval(moveInterval);
  playSound(sndGameOver);
  bgm.pause();
  // store best
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('buwaya_best', bestScore);
    bestText.textContent = `₱${bestScore}B`;
    setTimeout(()=> alert(`Game Over — NEW RECORD! ₱${score}B`), 10);
  } else {
    setTimeout(()=> alert(`Game Over — Final Score: ₱${score}B`), 10);
  }
}

/* ----------------------------
   Input handlers (keys & buttons)
   ---------------------------- */
function changeDirection(newDx, newDy) {
  // prevent reverse
  if (newDx === -dx && newDy === -dy) return;
  dx = newDx; dy = newDy;
}

document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  if (e.key === 'ArrowLeft') changeDirection(-1,0);
  if (e.key === 'ArrowRight') changeDirection(1,0);
  if (e.key === 'ArrowUp') changeDirection(0,-1);
  if (e.key === 'ArrowDown') changeDirection(0,1);
});

upBtn.onclick = () => changeDirection(0,-1);
downBtn.onclick = () => changeDirection(0,1);
leftBtn.onclick = () => changeDirection(-1,0);
rightBtn.onclick = () => changeDirection(1,0);

/* Touch swipe controls */
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
});
canvas.addEventListener('touchend', (e) => {
  if (!gameRunning) return;
  const t = e.changedTouches[0];
  const dxT = t.clientX - touchStartX;
  const dyT = t.clientY - touchStartY;
  if (Math.abs(dxT) > Math.abs(dyT)) {
    if (dxT > 20) changeDirection(1,0);
    else if (dxT < -20) changeDirection(-1,0);
  } else {
    if (dyT > 20) changeDirection(0,1);
    else if (dyT < -20) changeDirection(0,-1);
  }
});

/* ----------------------------
   Sound helper
   ---------------------------- */
function playSound(audioEl) {
  try {
    audioEl.currentTime = 0;
    audioEl.volume = 0.9;
    audioEl.play();
  } catch(e){}
}

/* ----------------------------
   UI & control bindings
   ---------------------------- */
startBtn.addEventListener('click', () => {
  if (gameRunning) return;
  resetGameState();
  gameRunning = true;
  paused = false;
  playSound(sndStart);
  setTimeout(()=> {
    try { bgm.currentTime = 0; bgm.volume = 0.25; bgm.play(); } catch(e){}
  }, 200);
  if (moveInterval) clearInterval(moveInterval);
  moveInterval = setInterval(() => {
    step();
  }, speedMs);
});

pauseBtn.addEventListener('click', () => {
  if (!gameRunning) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'RESUME' : 'PAUSE';
  if (paused) { bgm.pause(); } else { try{ bgm.play(); } catch(e){} }
});

resetBtn.addEventListener('click', () => {
  clearInterval(moveInterval);
  gameRunning = false;
  paused = false;
  resetGameState();
  bgm.pause(); bgm.currentTime = 0;
});

/* When difficulty or toggles change, reset layout */
difficultySelect.addEventListener('change', () => {
  resetGameState();
});
obstaclesToggle.addEventListener('change', () => {
  resetGameState();
});

/* ----------------------------
   Score UI
   ---------------------------- */
function updateScoreText() {
  scoreText.textContent = `₱${score}B`;
}

/* ----------------------------
   Main render loop (animation)
   ---------------------------- */
function animLoop() {
  frameCounter++;
  draw();
  requestAnimationFrame(animLoop);
}
animLoop();

/* ----------------------------
   Responsive: adjust canvas pixel size for crisp graphics
   ---------------------------- */
function adjustCanvasForDPI(){
  // keep canvas logical size 400x400, but set backing store for devicePixelRatio
  const DPR = window.devicePixelRatio || 1;
  canvas.width = 400 * DPR;
  canvas.height = 400 * DPR;
  canvas.style.width = '400px';
  canvas.style.height = '400px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  tileCountX = Math.floor(400 / gridSize);
  tileCountY = Math.floor(400 / gridSize);
}
window.addEventListener('resize', adjustCanvasForDPI);
applyDifficulty();
adjustCanvasForDPI();
resetGameState();

/* ----------------------------
   Small random periodic events while idle
   ---------------------------- */
setInterval(()=> {
  // randomly spawn a golden food if none and not running or during playing occasionally
  if (!goldenFood && Math.random() < 0.03) {
    placeGoldenFood();
  }
}, 2000);