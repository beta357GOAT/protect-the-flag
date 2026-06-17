// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_SIZE: 30,
    FLAG_SIZE: 30,
    ENEMY_SIZE: 20,
    PLAYER_SPEED: 5,
    ENEMY_SPEED: 2,
    BULLET_SPEED: 7,
    BULLET_SIZE: 5,
    WAVE_DELAY: 2000,
    ENEMY_SPAWN_INTERVAL: 1000,
};

// Game States
const GAME_STATE = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
};

// Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GAME_STATE.IDLE;
        
        this.player = null;
        this.flag = null;
        this.enemies = [];
        this.bullets = [];
        
        this.health = 100;
        this.score = 0;
        this.wave = 1;
        this.waveEnemyCount = 0;
        this.waveEnemiesKilled = 0;
        
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createPlayer();
        this.createFlag();
    }

    setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.keys[e.key] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);

        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', () => this.shoot());

        // Buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restart());
    }

    createPlayer() {
        this.player = {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT - 80,
            width: CONFIG.PLAYER_SIZE,
            height: CONFIG.PLAYER_SIZE,
            vx: 0,
            vy: 0,
        };
    }

    createFlag() {
        this.flag = {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: 50,
            width: CONFIG.FLAG_SIZE,
            height: CONFIG.FLAG_SIZE,
        };
    }

    start() {
        if (this.state === GAME_STATE.IDLE) {
            this.state = GAME_STATE.PLAYING;
            this.spawnWave();
            this.gameLoop();
            this.updateUI();
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
        }
    }

    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            document.getElementById('pauseBtn').textContent = 'Resume';
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            document.getElementById('pauseBtn').textContent = 'Pause';
            this.gameLoop();
        }
    }

    restart() {
        this.health = 100;
        this.score = 0;
        this.wave = 1;
        this.waveEnemyCount = 0;
        this.waveEnemiesKilled = 0;
        this.enemies = [];
        this.bullets = [];
        this.state = GAME_STATE.IDLE;
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('restartBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        document.getElementById('gameOverModal').classList.add('hidden');
        
        this.updateUI();
        this.draw();
    }

    spawnWave() {
        this.waveEnemyCount = 3 + this.wave * 2;
        this.waveEnemiesKilled = 0;
        this.spawnNextEnemy();
    }

    spawnNextEnemy() {
        if (this.waveEnemiesKilled < this.waveEnemyCount && this.state === GAME_STATE.PLAYING) {
            const x = Math.random() * CONFIG.CANVAS_WIDTH;
            const enemy = {
                x: x,
                y: -CONFIG.ENEMY_SIZE,
                width: CONFIG.ENEMY_SIZE,
                height: CONFIG.ENEMY_SIZE,
                vx: (Math.random() - 0.5) * 2,
                vy: CONFIG.ENEMY_SPEED,
            };
            this.enemies.push(enemy);
            setTimeout(() => this.spawnNextEnemy(), CONFIG.ENEMY_SPAWN_INTERVAL);
        }
    }

    updatePlayer() {
        // Reset velocity
        this.player.vx = 0;
        this.player.vy = 0;

        // Movement
        if (this.keys['ArrowLeft'] || this.keys['a']) this.player.vx = -CONFIG.PLAYER_SPEED;
        if (this.keys['ArrowRight'] || this.keys['d']) this.player.vx = CONFIG.PLAYER_SPEED;
        if (this.keys['ArrowUp'] || this.keys['w']) this.player.vy = -CONFIG.PLAYER_SPEED;
        if (this.keys['ArrowDown'] || this.keys['s']) this.player.vy = CONFIG.PLAYER_SPEED;

        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Boundary check
        this.player.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - this.player.height, this.player.y));
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            // Check if enemy reached flag
            if (this.checkCollision(enemy, this.flag)) {
                this.health -= 10;
                this.enemies.splice(i, 1);
            } else if (enemy.y > CONFIG.CANVAS_HEIGHT) {
                this.enemies.splice(i, 1);
            }
        }

        // Check if wave is complete
        if (this.enemies.length === 0 && this.waveEnemiesKilled === this.waveEnemyCount) {
            this.nextWave();
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Check collision with enemies
            let hit = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(bullet, this.enemies[j])) {
                    this.score += 10;
                    this.waveEnemiesKilled++;
                    this.enemies.splice(j, 1);
                    hit = true;
                    break;
                }
            }

            // Remove bullet if hit or out of bounds
            if (hit || bullet.y < 0 || bullet.x < 0 || bullet.x > CONFIG.CANVAS_WIDTH) {
                this.bullets.splice(i, 1);
            }
        }
    }

    shoot() {
        if (this.state !== GAME_STATE.PLAYING) return;

        const dx = this.mousePos.x - this.player.x;
        const dy = this.mousePos.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const bullet = {
            x: this.player.x,
            y: this.player.y,
            width: CONFIG.BULLET_SIZE,
            height: CONFIG.BULLET_SIZE,
            vx: (dx / distance) * CONFIG.BULLET_SPEED,
            vy: (dy / distance) * CONFIG.BULLET_SPEED,
        };
        this.bullets.push(bullet);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    nextWave() {
        this.wave++;
        this.waveEnemyCount = 0;
        this.waveEnemiesKilled = 0;
        setTimeout(() => this.spawnWave(), CONFIG.WAVE_DELAY);
    }

    updateUI() {
        document.getElementById('health').textContent = this.health;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('score').textContent = this.score;
    }

    drawPlayer() {
        this.ctx.fillStyle = '#4299e1';
        this.ctx.fillRect(this.player.x - this.player.width / 2, this.player.y - this.player.height / 2, this.player.width, this.player.height);
        
        // Draw aiming line
        const dx = this.mousePos.x - this.player.x;
        const dy = this.mousePos.y - this.player.y;
        this.ctx.strokeStyle = '#4299e1';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(this.player.x + dx * 0.5, this.player.y + dy * 0.5);
        this.ctx.stroke();
    }

    drawFlag() {
        // Pole
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(this.flag.x - 3, this.flag.y, 6, 40);
        
        // Flag
        this.ctx.fillStyle = '#f6ad55';
        this.ctx.beginPath();
        this.ctx.moveTo(this.flag.x + 3, this.flag.y);
        this.ctx.lineTo(this.flag.x + 25, this.flag.y + 8);
        this.ctx.lineTo(this.flag.x + 3, this.flag.y + 16);
        this.ctx.fill();
    }

    drawEnemies() {
        this.ctx.fillStyle = '#e53e3e';
        for (const enemy of this.enemies) {
            this.ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
        }
    }

    drawBullets() {
        this.ctx.fillStyle = '#ffd700';
        for (const bullet of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw game objects
        this.drawFlag();
        this.drawEnemies();
        this.drawBullets();
        this.drawPlayer();

        // Draw wave info
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Wave: ${this.wave} | Enemies: ${this.enemies.length}`, 10, 30);
    }

    update() {
        if (this.state !== GAME_STATE.PLAYING) return;

        this.updatePlayer();
        this.updateEnemies();
        this.updateBullets();
        this.updateUI();

        if (this.health <= 0) {
            this.endGame();
        }
    }

    endGame() {
        this.state = GAME_STATE.GAME_OVER;
        const modal = document.getElementById('gameOverModal');
        document.getElementById('gameOverTitle').textContent = 'Game Over!';
        document.getElementById('gameOverMessage').textContent = `You survived ${this.wave} waves!`;
        document.getElementById('finalScore').textContent = this.score;
        modal.classList.remove('hidden');
        document.getElementById('restartBtn').disabled = false;
    }

    gameLoop() {
        if (this.state === GAME_STATE.PLAYING) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        } else if (this.state === GAME_STATE.PAUSED) {
            this.draw();
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
