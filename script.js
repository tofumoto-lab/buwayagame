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
let dx = 1;
let dy = 0;
let score = 0;
let gameRunning = false;
let gameInterval;

let headImage = new Image();
let foodImage = new Image();

headImage.src = "buwaya2.png"; 
foodImage.src = "money.png"; 

function randomTile() {
    return Math.floor(Math.random() * tileCount);
}

function generateFood() {
    food = { x: randomTile(), y: randomTile() };

    // Avoid spawning food on the snake body
    while (snake.some(seg => seg.x === food.x && seg.y === food.y)) {
        food = { x: randomTile(), y: randomTile() };
    }
}

function drawGame() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake body
    ctx.fillStyle = "#0f0";
    for (let i = 1; i < snake.length; i++) {
        ctx.fillRect(
            snake[i].x * gridSize,
            snake[i].y * gridSize,
            gridSize - 2,
            gridSize - 2
        );
    }

    // Draw snake head
    if (headImage.complete) {
        ctx.drawImage(
            headImage,
            snake[0].x * gridSize,
            snake[0].y * gridSize,
            gridSize - 2,
            gridSize - 2
        );
    }

    // Draw food
    if (foodImage.complete) {
        ctx.drawImage(
            foodImage,
            food.x * gridSize,
            food.y * gridSize,
            gridSize - 2,
            gridSize - 2
        );
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wrap around edges
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;

    snake.unshift(head);

    // Eat food
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
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function gameLoop() {
    if (!gameRunning) return;

    moveSnake();

    if (checkCollision()) {
        gameRunning = false;
        clearInterval(gameInterval);
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

    if (newDx === -1 && !goingRight) { dx = -1; dy = 0; }
    else if (newDy === -1 && !goingDown) { dx = 0; dy = -1; }
    else if (newDx === 1 && !goingLeft) { dx = 1; dy = 0; }
    else if (newDy === 1 && !goingUp) { dx = 0; dy = 1; }
}

document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") changeDirection(-1, 0);
    if (e.key === "ArrowUp") changeDirection(0, -1);
    if (e.key === "ArrowRight") changeDirection(1, 0);
    if (e.key === "ArrowDown") changeDirection(0, 1);
});

upBtn.onclick = () => changeDirection(0, -1);
downBtn.onclick = () => changeDirection(0, 1);
leftBtn.onclick = () => changeDirection(-1, 0);
rightBtn.onclick = () => changeDirection(1, 0);

startBtn.onclick = () => {
    snake = [{ x: 10, y: 10 }];
    dx = 1;
    dy = 0;
    score = 0;
    gameRunning = true;

    scoreElement.textContent = "Score: ₱0B";

    if (gameInterval) clearInterval(gameInterval);

    generateFood();
    drawGame();
    gameInterval = setInterval(gameLoop, 90);
};
