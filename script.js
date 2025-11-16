const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

const gridSize = 30;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let gameRunning = false;
let headImage = new Image();
let foodImage = new Image();

headImage.src = 'buwaya2.png'; // Replace with your PNG file path
foodImage.src = 'money.png'; // Same image for food

function randomTile() {
    return Math.floor(Math.random() * tileCount);
}

function generateFood() {
    food = { x: randomTile(), y: randomTile() };
    // Ensure food doesn't spawn on snake
    while (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        food = { x: randomTile(), y: randomTile() };
    }
}

function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake body
    ctx.fillStyle = '#0f0';
    for (let i = 1; i < snake.length; i++) {
        ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
    }

    // Draw snake head with image
    if (headImage.complete) {
        ctx.drawImage(headImage, snake[0].x * gridSize, snake[0].y * gridSize, gridSize - 2, gridSize - 2);
    } else {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(snake[0].x * gridSize, snake[0].y * gridSize, gridSize - 2, gridSize - 2);
    }

    // Draw food with image
    if (foodImage.complete) {
        ctx.drawImage(foodImage, food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
    } else {
        ctx.fillStyle = '#f00';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Wrap around the screen
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;
    
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.textContent = `Score: ₱${score}B`;
        generateFood();
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];
    // Only check for self-collision (eating own body)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

function gameLoop() {
    if (!gameRunning) return;

    moveSnake();
    if (checkCollision()) {
        gameRunning = false;
        alert(`Game Over! Final Score: ₱${score}B`);
        return;
    }
    drawGame();
}

function changeDirection(newDx, newDy) {
    if (!gameRunning) return;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    if (newDx === -1 && !goingRight) {
        dx = -1;
        dy = 0;
    } else if (newDy === -1 && !goingDown) {
        dx = 0;
        dy = -1;
    } else if (newDx === 1 && !goingLeft) {
        dx = 1;
        dy = 0;
    } else if (newDy === 1 && !goingUp) {
        dx = 0;
        dy = 1;
    }
}

function handleKey(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = event.keyCode;
    if (keyPressed === LEFT_KEY) changeDirection(-1, 0);
    else if (keyPressed === UP_KEY) changeDirection(0, -1);
    else if (keyPressed === RIGHT_KEY) changeDirection(1, 0);
    else if (keyPressed === DOWN_KEY) changeDirection(0, 1);
}

function startGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    scoreElement.textContent = 'Score: ₱0B';
    generateFood();
    gameRunning = true;
    drawGame();
    setInterval(gameLoop, 90); // Slowed down from 100ms to 200ms
}

document.addEventListener('keydown', handleKey);
upBtn.addEventListener('click', () => changeDirection(0, -1));
downBtn.addEventListener('click', () => changeDirection(0, 1));
leftBtn.addEventListener('click', () => changeDirection(-1, 0));
rightBtn.addEventListener('click', () => changeDirection(1, 0));
startBtn.addEventListener('click', startGame);
