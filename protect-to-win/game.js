// Protect to Win: Neon Flag Assault
// Main Game Engine

// --- Game Configurations ---
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;

const TEAM_RED = 'red';
const TEAM_BLUE = 'blue';

// Weapons Config
const WEAPONS = {
    common: {
        id: 'common',
        name: 'COMMON BLASTER',
        rarity: 'common',
        price: 0,
        damage: 25,
        cooldown: 250, // ms
        bulletSpeed: 16,
        bulletSize: 4,
        color: '#ff007f', // Red/Pink for player
        desc: 'Reliable laser emitter. Fires single straight rounds.'
    },
    rare: {
        id: 'rare',
        name: 'RARE BURST RIFLE',
        rarity: 'rare',
        price: 10,
        damage: 20,
        cooldown: 400,
        bulletSpeed: 18,
        bulletSize: 4,
        color: '#39ff14',
        desc: 'Rapid fire. Emits 3-shot bursts in quick succession.'
    },
    epic: {
        id: 'epic',
        name: 'EPIC SPREAD SHOTGUN',
        rarity: 'epic',
        price: 20,
        damage: 18,
        cooldown: 550,
        bulletSpeed: 14,
        bulletSize: 3,
        color: '#a855f7',
        desc: 'Heavy spread. Fires a fanning layout of 5 shotgun shells.'
    },
    legendary: {
        id: 'legendary',
        name: 'LEGENDARY PLASMA',
        rarity: 'legendary',
        price: 35,
        damage: 75,
        cooldown: 900,
        bulletSpeed: 10,
        bulletSize: 9,
        color: '#ff9900',
        desc: 'Slow reload. Launches heavy plasma shells with splash blast radius.'
    },
    unique: {
        id: 'unique',
        name: 'UNIQUE LIGHTNING',
        rarity: 'unique',
        price: 50,
        damage: 5, // per tick (fired every frame)
        cooldown: 0,
        bulletSpeed: 0,
        bulletSize: 0,
        color: '#00f2fe',
        desc: 'Continuous energy stream. Melts through multiple enemies instantly.'
    },
    unstoppable: {
        id: 'unstoppable',
        name: 'UNSTOPPABLE SWARM',
        rarity: 'unstoppable',
        price: 100,
        damage: 30, // per rocket
        cooldown: 300, // standard reload (but holding M bypasses this!)
        bulletSpeed: 12,
        bulletSize: 6,
        color: '#ff0055',
        desc: 'Homing micro-missiles. Launches 4 rockets that seek closest targets.'
    }
};

// Map Obstacles (Walls)
const WALLS = [
    { x: 950, y: 350, w: 100, h: 500, color: '#4facfe' }, // Center Wall
    { x: 500, y: 150, w: 80, h: 300, color: '#ff007f' },  // Left Top Barrier
    { x: 500, y: 750, w: 80, h: 300, color: '#ff007f' },  // Left Bottom Barrier
    { x: 1420, y: 150, w: 80, h: 300, color: '#00f2fe' }, // Right Top Barrier
    { x: 1420, y: 750, w: 80, h: 300, color: '#00f2fe' }  // Right Bottom Barrier
];

// Base Coordinate Pads
const BASES = {
    red: { x: 200, y: 600, radius: 90, color: '#ff007f' },
    blue: { x: 1800, y: 600, radius: 90, color: '#00f2fe' }
};

// --- Game State Variables ---
let canvas, ctx;
let lastTime = 0;
let matchActive = false;
let score = { red: 0, blue: 0 };

// Load persistent game data from localStorage
let wallet = parseInt(localStorage.getItem('ptw_wallet')) || 0;
let purchasedWeapons = [];
try {
    purchasedWeapons = JSON.parse(localStorage.getItem('ptw_purchased'));
} catch (e) {}
if (!Array.isArray(purchasedWeapons) || purchasedWeapons.length === 0) {
    purchasedWeapons = ['common'];
}
let equippedWeapon = localStorage.getItem('ptw_equipped') || 'common';
if (!purchasedWeapons.includes(equippedWeapon)) {
    equippedWeapon = 'common';
}

let stats = { kills: 0, deaths: 0, flagsCaptured: 0, coinsEarned: 0 };

// Save persistent game data helper
function saveGameData() {
    localStorage.setItem('ptw_wallet', wallet);
    localStorage.setItem('ptw_purchased', JSON.stringify(purchasedWeapons));
    localStorage.setItem('ptw_equipped', equippedWeapon);
}

// Entities
let player;
let bots = [];
let bullets = [];
let particles = [];
let floatingCoins = [];
let flags = {
    red: {
        team: TEAM_RED,
        homeX: BASES.red.x,
        homeY: BASES.red.y,
        x: BASES.red.x,
        y: BASES.red.y,
        radius: 20,
        color: '#ff007f',
        carrier: null,
        status: 'home', // 'home', 'stolen', 'dropped'
        dropTime: 0
    },
    blue: {
        team: TEAM_BLUE,
        homeX: BASES.blue.x,
        homeY: BASES.blue.y,
        x: BASES.blue.x,
        y: BASES.blue.y,
        radius: 20,
        color: '#00f2fe',
        carrier: null,
        status: 'home', // 'home', 'stolen', 'dropped'
        dropTime: 0
    }
};

// Keyboard inputs
const keys = {};
let mouse = { x: 0, y: 0, isDown: false, worldX: 0, worldY: 0 };
let camera = { x: 0, y: 0 };

// Touch and Twin-Stick Joystick State
let touchDevice = false;
let leftTouchId = null;
let rightTouchId = null;
let leftJoystick = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };
let rightJoystick = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };

// Weapon Cooldowns & Action timers
let fireCooldown = 0;
let mKeyInterval = null;
let lightningActive = false;

// --- Initialize DOM Elements ---
const menuOverlay = document.getElementById('menu-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameHud = document.getElementById('game-hud');
const shopOverlay = document.getElementById('shop-overlay');

const btnStart = document.getElementById('btn-start');
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const btnShopToggle = document.getElementById('btn-shop-toggle');
const btnShopClose = document.getElementById('btn-shop-close');
const btnRestart = document.getElementById('btn-restart');
const btnMainMenu = document.getElementById('btn-main-menu');

const scoreRed = document.getElementById('score-red');
const scoreBlue = document.getElementById('score-blue');
const healthBar = document.getElementById('health-bar');
const healthText = document.getElementById('health-text');
const weaponName = document.getElementById('weapon-name');
const weaponRarity = document.getElementById('weapon-rarity');
const walletBalance = document.getElementById('wallet-balance');
const shopWalletBalance = document.getElementById('shop-wallet-balance');
const warningBanner = document.getElementById('warning-banner');
const warningMessage = document.getElementById('warning-message');
const redFlagStatus = document.getElementById('red-flag-status');
const blueFlagStatus = document.getElementById('blue-flag-status');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const endStats = document.getElementById('end-stats');

// --- Helper Functions ---
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Particle System
class Particle {
    constructor(x, y, color, size, vx, vy, life, type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = life;
        this.life = life;
        this.type = type; // 'spark', 'smoke', 'plasma', 'trail'
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.type === 'smoke') {
            this.vx *= 0.95;
            this.vy *= 0.95;
            this.size += 0.15;
        } else if (this.type === 'spark') {
            this.vx *= 0.98;
            this.vy *= 0.98;
        }
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.type === 'plasma' ? 10 : 5;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        if (this.type === 'smoke') {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        } else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

function spawnExplosion(x, y, color, count = 20, force = 6) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * force + 1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = Math.random() * 3 + 1.5;
        const life = Math.random() * 25 + 15;
        particles.push(new Particle(x, y, color, size, vx, vy, life, 'spark'));
    }
}

function spawnSmoke(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.8;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = Math.random() * 3 + 2;
        const life = Math.random() * 20 + 10;
        particles.push(new Particle(x, y, 'rgba(150, 150, 160, 0.4)', size, vx, vy, life, 'smoke'));
    }
}

// Float texts (Coins earned, Damage numbers)
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = -1.5;
        this.life = 45;
    }
    update() {
        this.y += this.vy;
        this.life--;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / 45;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.font = 'bold 16px var(--font-header)';
        ctx.fillText(this.text, this.x - ctx.measureText(this.text).width / 2, this.y);
        ctx.restore();
    }
}

// --- Entities Classes ---
class Unit {
    constructor(x, y, team, isPlayer = false, role = 'attacker') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 22;
        this.team = team;
        this.isPlayer = isPlayer;
        this.role = role; // 'attacker', 'defender', 'chaser'
        this.health = 100;
        this.maxHealth = 100;
        this.angle = 0;
        this.speed = isPlayer ? 6.5 : 4.2;
        this.shootCooldown = 0;
        this.respawnTimer = 0;
        
        // Bot AI states
        this.targetNode = null;
        this.stateTimer = 0;
    }

    update(dt) {
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        // Apply friction
        this.vx *= 0.85;
        this.vy *= 0.85;

        // Apply movement forces
        if (this.isPlayer) {
            this.handlePlayerInput();
        } else {
            this.handleBotAI();
        }

        // Apply velocities
        this.x += this.vx;
        this.y += this.vy;

        // Check boundaries
        if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
        if (this.x > WORLD_WIDTH - this.radius) { this.x = WORLD_WIDTH - this.radius; this.vx = 0; }
        if (this.y < this.radius) { this.y = this.radius; this.vy = 0; }
        if (this.y > WORLD_HEIGHT - this.radius) { this.y = WORLD_HEIGHT - this.radius; this.vy = 0; }

        // Check obstacle collisions
        this.checkWallCollisions();

        // Animate flag trail if carrying
        const myFlag = this.team === TEAM_RED ? flags.blue : flags.red;
        if (myFlag.carrier === this) {
            if (Math.random() < 0.25) {
                particles.push(new Particle(
                    this.x - Math.cos(this.angle) * 15,
                    this.y - Math.sin(this.angle) * 15,
                    myFlag.color,
                    Math.random() * 3 + 1,
                    -Math.cos(this.angle) * 1.5,
                    -Math.sin(this.angle) * 1.5,
                    20,
                    'trail'
                ));
            }
        }
    }

    handlePlayerInput() {
        let ax = 0;
        let ay = 0;

        if (leftJoystick.active) {
            const dx = leftJoystick.curX - leftJoystick.startX;
            const dy = leftJoystick.curY - leftJoystick.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                const angle = Math.atan2(dy, dx);
                const amt = Math.min(1, dist / 60);
                this.vx += Math.cos(angle) * this.speed * amt * 0.2;
                this.vy += Math.sin(angle) * this.speed * amt * 0.2;
            }
        } else {
            // Handle WASD and Arrows
            if (keys['w'] || keys['arrowup'] || keys['1']) ay -= 1;
            if (keys['s'] || keys['arrowdown'] || keys['2']) ay += 1;
            if (keys['a'] || keys['arrowleft']) ax -= 1;
            if (keys['d'] || keys['arrowright']) ax += 1;

            if (ax !== 0 && ay !== 0) {
                // Normalize diagonal
                ax *= 0.7071;
                ay *= 0.7071;
            }

            this.vx += ax * this.speed * 0.2;
            this.vy += ay * this.speed * 0.2;
        }

        // Aim angle
        if (rightJoystick.active) {
            const dx = rightJoystick.curX - rightJoystick.startX;
            const dy = rightJoystick.curY - rightJoystick.startY;
            if (dx !== 0 || dy !== 0) {
                this.angle = Math.atan2(dy, dx);
            }
        } else {
            // Aim towards mouse
            const dx = mouse.worldX - this.x;
            const dy = mouse.worldY - this.y;
            this.angle = Math.atan2(dy, dx);
        }
    }

    handleBotAI() {
        // Simple steering behavior towards target
        let targetX = this.x;
        let targetY = this.y;

        const friendlyFlag = this.team === TEAM_RED ? flags.red : flags.blue;
        const enemyFlag = this.team === TEAM_RED ? flags.blue : flags.red;
        const myBase = this.team === TEAM_RED ? BASES.red : BASES.blue;
        const enemyBase = this.team === TEAM_RED ? BASES.blue : BASES.red;

        // Find nearest visible enemy unit
        let nearestEnemy = null;
        let minDist = 500; // Attack range
        const opponentTeam = this.team === TEAM_RED ? TEAM_BLUE : TEAM_RED;
        
        // Include player in targets if bot is Blue
        if (this.team === TEAM_BLUE && player.respawnTimer <= 0) {
            const dist = getDistance(this.x, this.y, player.x, player.y);
            if (dist < minDist) {
                minDist = dist;
                nearestEnemy = player;
            }
        }

        bots.forEach(b => {
            if (b.team === opponentTeam && b.respawnTimer <= 0) {
                const dist = getDistance(this.x, this.y, b.x, b.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestEnemy = b;
                }
            }
        });

        // 1. Determine Target Coordinates
        if (enemyFlag.carrier === this) {
            // We have the enemy flag! Run back to our base to score!
            targetX = myBase.x;
            targetY = myBase.y;
        } else if (friendlyFlag.status === 'stolen') {
            // Our flag is stolen! All roles hunt the carrier to return the flag.
            const carrier = friendlyFlag.carrier;
            if (carrier) {
                targetX = carrier.x;
                targetY = carrier.y;
            }
        } else if (friendlyFlag.status === 'dropped') {
            // Our flag is dropped on the floor! Defender/Chaser rush to return it.
            if (this.role !== 'attacker') {
                targetX = friendlyFlag.x;
                targetY = friendlyFlag.y;
            } else {
                // Attacker still pushes to grab enemy flag
                targetX = enemyFlag.x;
                targetY = enemyFlag.y;
            }
        } else {
            // Standard situations based on Role
            if (this.role === 'attacker') {
                // Target the enemy flag (whether dropped or home)
                targetX = enemyFlag.x;
                targetY = enemyFlag.y;
            } else if (this.role === 'defender') {
                // Guard base area
                const distToBase = getDistance(this.x, this.y, myBase.x, myBase.y);
                if (nearestEnemy && minDist < 450) {
                    // Attack close intruders
                    targetX = nearestEnemy.x;
                    targetY = nearestEnemy.y;
                } else if (distToBase > 220) {
                    // Return home if drifted too far
                    targetX = myBase.x;
                    targetY = myBase.y;
                } else {
                    // Patrol circle around base
                    this.stateTimer += 0.02;
                    targetX = myBase.x + Math.cos(this.stateTimer) * 150;
                    targetY = myBase.y + Math.sin(this.stateTimer) * 150;
                }
            } else if (this.role === 'chaser') {
                // Chase any close enemy, or patrol mid field
                if (nearestEnemy) {
                    targetX = nearestEnemy.x;
                    targetY = nearestEnemy.y;
                } else {
                    // Move to center area lanes
                    this.stateTimer += 0.01;
                    const centerOffset = this.team === TEAM_RED ? 400 : -400;
                    targetX = WORLD_WIDTH / 2 + centerOffset;
                    targetY = WORLD_HEIGHT / 2 + Math.sin(this.stateTimer * 2) * 350;
                }
            }
        }

        // Steering logic
        const angleToTarget = Math.atan2(targetY - this.y, targetX - this.x);
        let forceX = Math.cos(angleToTarget) * this.speed * 0.18;
        let forceY = Math.sin(angleToTarget) * this.speed * 0.18;

        // Obstacle avoidance (nudge away from walls)
        WALLS.forEach(wall => {
            const pad = 40;
            if (this.x > wall.x - pad && this.x < wall.x + wall.w + pad &&
                this.y > wall.y - pad && this.y < wall.y + wall.h + pad) {
                // Compute vector away from wall center
                const wallCenterX = wall.x + wall.w / 2;
                const wallCenterY = wall.y + wall.h / 2;
                const avoidAngle = Math.atan2(this.y - wallCenterY, this.x - wallCenterX);
                forceX += Math.cos(avoidAngle) * this.speed * 0.3;
                forceY += Math.sin(avoidAngle) * this.speed * 0.3;
            }
        });

        // Add forces to velocities
        this.vx += forceX;
        this.vy += forceY;

        // Face movement direction or target
        if (nearestEnemy && minDist < 450) {
            this.angle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
            // Fire at enemies
            if (this.shootCooldown <= 0) {
                this.botFire(nearestEnemy);
            }
        } else {
            this.angle = Math.atan2(this.vy, this.vx);
        }
    }

    botFire(target) {
        // Standard blasters for bots
        this.shootCooldown = 450 + Math.random() * 200; // ms
        
        // Spawn cyan/pink projectile based on team
        const bulletColor = this.team === TEAM_RED ? '#ff007f' : '#00f2fe';
        const spread = (Math.random() - 0.5) * 0.15; // slightly inaccurate
        const fireAngle = this.angle + spread;

        bullets.push({
            x: this.x + Math.cos(this.angle) * this.radius,
            y: this.y + Math.sin(this.angle) * this.radius,
            vx: Math.cos(fireAngle) * 14,
            vy: Math.sin(fireAngle) * 14,
            radius: 4,
            damage: 15,
            team: this.team,
            color: bulletColor,
            type: 'bullet'
        });

        // Play standard sound if close to screen focus (approximated)
        const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
        if (distToPlayer < 700) {
            sfx.playLaser();
        }
    }

    checkWallCollisions() {
        WALLS.forEach(wall => {
            // Find closest point on wall AABB
            const closestX = Math.max(wall.x, Math.min(this.x, wall.x + wall.w));
            const closestY = Math.max(wall.y, Math.min(this.y, wall.y + wall.h));
            const distance = getDistance(this.x, this.y, closestX, closestY);

            if (distance < this.radius) {
                // Collision! Push unit away
                const pushDist = this.radius - distance;
                const angle = Math.atan2(this.y - closestY, this.x - closestX);
                
                // If exactly center-on-corner, nudge randomly
                const dirX = distance === 0 ? Math.cos(Math.random() * Math.PI) : Math.cos(angle);
                const dirY = distance === 0 ? Math.sin(Math.random() * Math.PI) : Math.sin(angle);

                this.x += dirX * pushDist;
                this.y += dirY * pushDist;

                // Dampen velocities
                this.vx *= 0.5;
                this.vy *= 0.5;
            }
        });
    }

    takeDamage(amount, attackerTeam) {
        if (this.respawnTimer > 0) return;

        this.health -= amount;
        
        // Visual hit spark
        spawnExplosion(this.x, this.y, this.team === TEAM_RED ? '#ff3333' : '#00f2fe', 5, 3);
        
        if (this.health <= 0) {
            this.health = 0;
            this.die(attackerTeam);
        }
    }

    die(attackerTeam) {
        this.respawnTimer = 4000; // 4 seconds respawn
        sfx.playDeath();
        spawnExplosion(this.x, this.y, this.team === TEAM_RED ? '#ff0055' : '#00f2fe', 35, 7);

        // Stats tracking
        if (this.isPlayer) {
            stats.deaths++;
            addWarningBanner("YOU WERE ELIMINATED!");
        } else {
            if (this.team === TEAM_BLUE) {
                // If player team killed the bot
                if (attackerTeam === TEAM_RED) {
                    stats.kills++;
                    const coinsReward = 100;
                    wallet += coinsReward;
                    stats.coinsEarned += coinsReward;
                    saveGameData();
                    updateHUD();
                    sfx.playCoin();
                    
                    // Spawn flying coin text
                    floatingCoins.push(new FloatingText(this.x, this.y, '+$100', '#39ff14'));
                }
            }
        }

        // If carrying a flag, drop it!
        const opponentFlag = this.team === TEAM_RED ? flags.blue : flags.red;
        if (opponentFlag.carrier === this) {
            opponentFlag.carrier = null;
            opponentFlag.status = 'dropped';
            opponentFlag.x = this.x;
            opponentFlag.y = this.y;
            opponentFlag.dropTime = 15000; // 15s return timer
            
            addWarningBanner(`${this.team.toUpperCase()} FLAG CARRIER KILLED!`);
            sfx.playFlagStolen();
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        
        // Spawn at Base
        const myBase = this.team === TEAM_RED ? BASES.red : BASES.blue;
        // Offset slightly to prevent overlapping
        this.x = myBase.x + (Math.random() - 0.5) * 50;
        this.y = myBase.y + (Math.random() - 0.5) * 50;
        this.vx = 0;
        this.vy = 0;

        spawnExplosion(this.x, this.y, this.team === TEAM_RED ? '#ff007f' : '#00f2fe', 15, 3);
    }

    draw(ctx) {
        if (this.respawnTimer > 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Neon shadow glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.team === TEAM_RED ? 'rgba(255, 0, 127, 0.6)' : 'rgba(0, 242, 254, 0.6)';

        // Draw outer ring border
        ctx.strokeStyle = this.team === TEAM_RED ? '#ff007f' : '#00f2fe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw body fill
        ctx.fillStyle = this.team === TEAM_RED ? 'rgba(255, 0, 127, 0.25)' : 'rgba(0, 242, 254, 0.25)';
        ctx.fill();

        // Draw directional gun turret line
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.radius + 10, 0);
        ctx.stroke();

        ctx.restore();

        // Draw HUD health indicator directly above unit
        ctx.save();
        ctx.translate(this.x, this.y - this.radius - 12);
        
        // BG bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-20, 0, 40, 4);

        // Green/Red Health Fill
        const hpPct = this.health / this.maxHealth;
        ctx.fillStyle = hpPct > 0.4 ? '#39ff14' : '#ff3333';
        ctx.fillRect(-20, 0, 40 * hpPct, 4);
        
        // Text tag for player
        if (this.isPlayer) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px var(--font-header)';
            ctx.fillText('YOU', -8, -5);
        }
        ctx.restore();
    }
}

// --- Weapon Firing Execution ---
function firePlayerWeapon() {
    if (player.respawnTimer > 0 || fireCooldown > 0) return;

    const config = WEAPONS[equippedWeapon];
    fireCooldown = config.cooldown;

    const angle = player.angle;
    const startX = player.x + Math.cos(angle) * (player.radius + 12);
    const startY = player.y + Math.sin(angle) * (player.radius + 12);

    if (equippedWeapon === 'common') {
        sfx.playLaser();
        bullets.push({
            x: startX, y: startY,
            vx: Math.cos(angle) * config.bulletSpeed,
            vy: Math.sin(angle) * config.bulletSpeed,
            radius: config.bulletSize,
            damage: config.damage,
            team: TEAM_RED,
            color: '#ff007f', // Red/Pink laser tracers
            type: 'bullet'
        });
    } 
    else if (equippedWeapon === 'rare') {
        // Triple Burst (rapid sequence)
        sfx.playBurst();
        let shot = 0;
        const burstInterval = setInterval(() => {
            if (player.respawnTimer > 0 || !matchActive) {
                clearInterval(burstInterval);
                return;
            }
            const burstX = player.x + Math.cos(player.angle) * (player.radius + 12);
            const burstY = player.y + Math.sin(player.angle) * (player.radius + 12);
            bullets.push({
                x: burstX, y: burstY,
                vx: Math.cos(player.angle) * config.bulletSpeed,
                vy: Math.sin(player.angle) * config.bulletSpeed,
                radius: config.bulletSize,
                damage: config.damage,
                team: TEAM_RED,
                color: '#39ff14', // Neon green burst tracers
                type: 'bullet'
            });
            shot++;
            if (shot >= 3) clearInterval(burstInterval);
        }, 80);
    } 
    else if (equippedWeapon === 'epic') {
        sfx.playShotgun();
        // 5 fanning shotgun layout (spread)
        const spreadCount = 5;
        const angleSpread = 0.08 * Math.PI; // spacing angle (around 14 degrees)
        for (let i = -2; i <= 2; i++) {
            const pelletAngle = angle + (i * angleSpread);
            bullets.push({
                x: startX, y: startY,
                vx: Math.cos(pelletAngle) * config.bulletSpeed * (0.9 + Math.random() * 0.2), // slightly randomized velocity
                vy: Math.sin(pelletAngle) * config.bulletSpeed * (0.9 + Math.random() * 0.2),
                radius: config.bulletSize,
                damage: config.damage,
                team: TEAM_RED,
                color: '#a855f7', // Purple shotgun spray
                type: 'bullet',
                range: 40, // disappear after 40 update ticks
                life: 40
            });
        }
    } 
    else if (equippedWeapon === 'legendary') {
        sfx.playPlasmaLaunch();
        bullets.push({
            x: startX, y: startY,
            vx: Math.cos(angle) * config.bulletSpeed,
            vy: Math.sin(angle) * config.bulletSpeed,
            radius: config.bulletSize,
            damage: config.damage,
            team: TEAM_RED,
            color: '#ff9900', // Gold/orange glowing ball
            type: 'plasma',
            glow: '#ff9900'
        });
    } 
    else if (equippedWeapon === 'unique') {
        // Continuous Laser - handled in the loop drawing
        if (!lightningActive) {
            sfx.startLightningLaser();
            lightningActive = true;
        }
    } 
    else if (equippedWeapon === 'unstoppable') {
        sfx.playMissileLaunch();
        // 4 homing rockets sweeping outwards
        const baseAngles = [-0.4, -0.15, 0.15, 0.4];
        baseAngles.forEach(offsetAngle => {
            const mAngle = angle + offsetAngle;
            bullets.push({
                x: startX, y: startY,
                vx: Math.cos(mAngle) * config.bulletSpeed * 0.6, // Start slower then track
                vy: Math.sin(mAngle) * config.bulletSpeed * 0.6,
                radius: config.bulletSize,
                damage: config.damage,
                team: TEAM_RED,
                color: '#ff0055',
                type: 'missile',
                angle: mAngle,
                target: null,
                trailTimer: 0,
                speed: config.bulletSpeed
            });
        });
    }
}

// Special Rapid-Fire Missile from M key holding
function spawnMKeyMissile() {
    if (player.respawnTimer > 0 || !matchActive) return;

    // Only works if Unstoppable Swarm is equipped
    if (equippedWeapon !== 'unstoppable') {
        firePlayerWeapon();
        return;
    }

    // High speed single micro missile
    const angle = player.angle + (Math.random() - 0.5) * 0.4;
    const startX = player.x + Math.cos(player.angle) * (player.radius + 15);
    const startY = player.y + Math.sin(player.angle) * (player.radius + 15);

    sfx.playMissileLaunch();
    bullets.push({
        x: startX, y: startY,
        vx: Math.cos(angle) * 8, 
        vy: Math.sin(angle) * 8,
        radius: 7, // Big missile representation
        damage: WEAPONS.unstoppable.damage,
        team: TEAM_RED,
        color: '#ff0055',
        type: 'missile',
        angle: angle,
        target: null,
        trailTimer: 0,
        speed: 16 // Travel faster
    });
}

// --- Map Render Functions ---
function drawGrid(ctx, camX, camY) {
    ctx.save();
    ctx.strokeStyle = '#150f28';
    ctx.lineWidth = 1;

    const gridSize = 80;
    const startX = Math.floor(camX / gridSize) * gridSize;
    const startY = Math.floor(camY / gridSize) * gridSize;

    for (let x = startX - window.innerWidth; x < startX + window.innerWidth * 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
    }
    for (let y = startY - window.innerHeight; y < startY + window.innerHeight * 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBases(ctx) {
    // Draw Red Pad
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = BASES.red.color;
    ctx.strokeStyle = BASES.red.color;
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
    ctx.beginPath();
    ctx.arc(BASES.red.x, BASES.red.y, BASES.red.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw Core Ring inside Red Base
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(BASES.red.x, BASES.red.y, BASES.red.radius - 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw Blue Pad
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = BASES.blue.color;
    ctx.strokeStyle = BASES.blue.color;
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
    ctx.beginPath();
    ctx.arc(BASES.blue.x, BASES.blue.y, BASES.blue.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw Core Ring inside Blue Base
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(BASES.blue.x, BASES.blue.y, BASES.blue.radius - 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawWalls(ctx) {
    ctx.save();
    WALLS.forEach(wall => {
        // Glowing Neon Wall Outline
        ctx.shadowBlur = 15;
        ctx.shadowColor = wall.color;
        ctx.fillStyle = '#0a0815';
        ctx.strokeStyle = wall.color;
        ctx.lineWidth = 3;

        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        // Internal neon cross pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.moveTo(wall.x + wall.w, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.h);
        ctx.stroke();
    });
    ctx.restore();
}

function drawFlag(ctx, flag) {
    let flagX = flag.x;
    let flagY = flag.y;

    if (flag.carrier) {
        // Float slightly behind the carrier
        const angle = flag.carrier.angle;
        flagX = flag.carrier.x - Math.cos(angle) * 15;
        flagY = flag.carrier.y - Math.sin(angle) * 15;
    }

    ctx.save();
    ctx.translate(flagX, flagY);

    // Neon shadow glow
    ctx.shadowBlur = 18;
    ctx.shadowColor = flag.color;

    // Draw flag pole
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -25);
    ctx.stroke();

    // Draw waving triangular flag banner
    ctx.fillStyle = flag.color;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(22, -15);
    ctx.lineTo(0, -5);
    ctx.closePath();
    ctx.fill();

    // Floating orb above pole
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -27, 4, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

// --- Lightning Laser Rendering & Checking ---
function handleLightningAttack(ctx) {
    if (player.respawnTimer > 0 || !matchActive) {
        if (lightningActive) {
            sfx.stopLightningLaser();
            lightningActive = false;
        }
        return;
    }

    // Determine lightning beam endpoints
    const angle = player.angle;
    const startX = player.x + Math.cos(angle) * (player.radius + 12);
    const startY = player.y + Math.sin(angle) * (player.radius + 12);
    
    // Laser distance max
    const maxLen = 800;
    const targetX = startX + Math.cos(angle) * maxLen;
    const targetY = startY + Math.sin(angle) * maxLen;

    // Line intersection: Find closest collision on walls
    let beamLength = maxLen;
    let endX = targetX;
    let endY = targetY;

    WALLS.forEach(wall => {
        // Simple ray vs AABB intersection check
        const t = intersectRayAABB(startX, startY, Math.cos(angle), Math.sin(angle), wall.x, wall.y, wall.w, wall.h);
        if (t !== null && t >= 0 && t < beamLength) {
            beamLength = t;
            endX = startX + Math.cos(angle) * t;
            endY = startY + Math.sin(angle) * t;
        }
    });

    // Draw the multi-layer lightning laser beam
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00f2fe';

    // Outer cyan core glow
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Medium beam
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Inner bright white laser line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Sparks flying from collision point
    if (Math.random() < 0.4) {
        spawnExplosion(endX, endY, '#00f2fe', 2, 2);
    }
    ctx.restore();

    // Deal damage to Blue bots in beam path
    bots.forEach(bot => {
        if (bot.respawnTimer <= 0 && bot.team === TEAM_BLUE) {
            // Check distance from bot center point to the line segment
            const dist = distPointToSegment(bot.x, bot.y, startX, startY, endX, endY);
            if (dist < bot.radius + 5) {
                bot.takeDamage(WEAPONS.unique.damage, TEAM_RED);
            }
        }
    });
}

// Ray-AABB intersection helpers
function intersectRayAABB(rx, ry, rdx, rdy, ax, ay, aw, ah) {
    let tmin = -Infinity, tmax = Infinity;

    if (rdx !== 0) {
        const tx1 = (ax - rx) / rdx;
        const tx2 = (ax + aw - rx) / rdx;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (rx < ax || rx > ax + aw) {
        return null;
    }

    if (rdy !== 0) {
        const ty1 = (ay - ry) / rdy;
        const ty2 = (ay + ah - ry) / rdy;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (ry < ay || ry > ay + ah) {
        return null;
    }

    if (tmax >= tmin && tmax >= 0) {
        return tmin >= 0 ? tmin : tmax;
    }
    return null;
}

function distPointToSegment(px, py, x1, y1, x2, y2) {
    const l2 = getDistance(x1, y1, x2, y2) ** 2;
    if (l2 === 0) return getDistance(px, py, x1, y1);
    
    // Project point onto line segment
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    
    return getDistance(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

// --- Game Over/Defeat Check ---
function checkMatchFinished() {
    if (score.red >= 3 || score.blue >= 3) {
        matchActive = false;
        
        if (lightningActive) {
            sfx.stopLightningLaser();
            lightningActive = false;
        }

        // Show Stats GameOver
        gameOverOverlay.classList.remove('hidden');
        gameHud.classList.add('hud-hidden');

        if (score.red >= 3) {
            endTitle.innerText = "MATCH VICTORY";
            endTitle.className = "text-glow-green";
            endMessage.innerText = "Red Team captured the enemy flag 3 times!";
            sfx.playFlagScored();
        } else {
            endTitle.innerText = "MATCH DEFEAT";
            endTitle.className = "text-glow-red";
            endMessage.innerText = "Blue Team captured your flag 3 times!";
        }

        endStats.innerHTML = `
            <div>
                <span class="hud-label">DEFEATED ENEMIES</span>
                <span class="stat-val text-glow-magenta">${stats.kills}</span>
            </div>
            <div>
                <span class="hud-label">CREDITS ACQUIRED</span>
                <span class="stat-val text-glow-green">$${stats.coinsEarned}</span>
            </div>
            <div>
                <span class="hud-label">DEATHS</span>
                <span class="stat-val text-glow-red">${stats.deaths}</span>
            </div>
        `;
    }
}

// --- Hud warning notifications ---
let bannerTimeout = null;
function addWarningBanner(msg) {
    warningMessage.innerText = msg;
    warningBanner.classList.remove('warning-banner-hidden');
    
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
        warningBanner.classList.add('warning-banner-hidden');
    }, 3500);
}

// --- Main Engine Game Update & Render Loop ---
function updateAndRender(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    if (!matchActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Update camera smoothly following player ---
    const targetCamX = player.x - canvas.width / 2;
    const targetCamY = player.y - canvas.height / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    // Apply viewport bounds to camera to prevent scrolling outside the map borders
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, camera.y));

    // Update screen-space mouse to world space coord
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;

    // --- RENDER SCENERY (Translate by Camera) ---
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Grid Floor
    drawGrid(ctx, camera.x, camera.y);

    // Base Circular Pads
    drawBases(ctx);

    // Obstacle Walls
    drawWalls(ctx);

    // Flags Status returns timers updates
    [flags.red, flags.blue].forEach(flag => {
        if (flag.status === 'dropped') {
            flag.dropTime -= dt;
            if (flag.dropTime <= 0) {
                // Return flag to base automatically
                flag.status = 'home';
                flag.carrier = null;
                flag.x = flag.homeX;
                flag.y = flag.homeY;
                sfx.playFlagReturned();
                addWarningBanner(`${flag.team.toUpperCase()} FLAG RETURNED TO BASE!`);
            }
        }
    });

    // Update & Draw Player
    player.update(dt);
    player.draw(ctx);

    // Update & Draw Team Bots
    bots.forEach(bot => {
        bot.update(dt);
        bot.draw(ctx);
    });

    // Handle weapon cooldown
    if (fireCooldown > 0) {
        fireCooldown -= dt;
    }

    // Handle mouse hold fire (except lightning which works continuously and unstoppable with M keys)
    const isFiring = (mouse.isDown || rightJoystick.active || (touchDevice && leftJoystick.active)) && !shopOverlay.classList.contains('shop-active');
    if (isFiring && fireCooldown <= 0 && equippedWeapon !== 'unique') {
        firePlayerWeapon();
    }

    // Lightning Laser Firing
    if (equippedWeapon === 'unique' && (isFiring || keys['m'])) {
        handleLightningAttack(ctx);
    } else {
        if (lightningActive) {
            sfx.stopLightningLaser();
            lightningActive = false;
        }
    }

    // Update & Draw Projectile Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        
        if (b.type === 'missile') {
            // Homing Swarm Logic
            // Find nearest target if none or dead
            const opponentTeam = b.team === TEAM_RED ? TEAM_BLUE : TEAM_RED;
            if (!b.target || b.target.respawnTimer > 0) {
                let nearest = null;
                let minDist = 750;
                
                bots.forEach(bot => {
                    if (bot.team === opponentTeam && bot.respawnTimer <= 0) {
                        const dist = getDistance(b.x, b.y, bot.x, bot.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = bot;
                        }
                    }
                });

                if (b.team === TEAM_BLUE && player.respawnTimer <= 0) {
                    const dist = getDistance(b.x, b.y, player.x, player.y);
                    if (dist < minDist) {
                        nearest = player;
                    }
                }
                b.target = nearest;
            }

            if (b.target) {
                // Steer towards target
                const desiredAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
                let diff = desiredAngle - b.angle;
                
                // Keep angle in range
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                // Turn limit
                const turnRate = 0.09;
                b.angle += Math.max(-turnRate, Math.min(turnRate, diff));
                
                // Recompute velocities
                b.vx = Math.cos(b.angle) * b.speed;
                b.vy = Math.sin(b.angle) * b.speed;
            }

            // Move missile
            b.x += b.vx;
            b.y += b.vy;

            // Spawn tail smoke flame
            b.trailTimer++;
            if (b.trailTimer % 2 === 0) {
                // Rocket exhaust fire trail
                particles.push(new Particle(
                    b.x - Math.cos(b.angle) * 12,
                    b.y - Math.sin(b.angle) * 12,
                    '#ff9900', // Fire orange
                    Math.random() * 3.5 + 1.5,
                    -Math.cos(b.angle) * 2,
                    -Math.sin(b.angle) * 2,
                    15,
                    'spark'
                ));
            }
        } else {
            // Standard Bullet Move
            b.x += b.vx;
            b.y += b.vy;
        }

        // Epic Shotgun range limiter
        if (b.range !== undefined) {
            b.life--;
            if (b.life <= 0) {
                bullets.splice(i, 1);
                continue;
            }
        }

        let hitObstacle = false;

        // Check Wall Collision
        for (let j = 0; j < WALLS.length; j++) {
            const w = WALLS[j];
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                hitObstacle = true;
                break;
            }
        }

        // Boundary Collision
        if (b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
            hitObstacle = true;
        }

        if (hitObstacle) {
            if (b.type === 'plasma') {
                explodePlasma(b.x, b.y, b.team);
            } else {
                // Spark splash
                spawnExplosion(b.x, b.y, b.color, 4, 3);
            }
            bullets.splice(i, 1);
            continue;
        }

        // Check Target Hit Collisions
        let hitTarget = false;
        const targetTeam = b.team === TEAM_RED ? TEAM_BLUE : TEAM_RED;

        if (targetTeam === TEAM_BLUE) {
            // Player hit enemies bots
            for (let j = 0; j < bots.length; j++) {
                const bot = bots[j];
                if (bot.respawnTimer <= 0 && bot.team === TEAM_BLUE) {
                    if (getDistance(b.x, b.y, bot.x, bot.y) < bot.radius) {
                        bot.takeDamage(b.damage, b.team);
                        hitTarget = true;
                        break;
                    }
                }
            }
        } else {
            // Blue bots hit Player or Red bots
            if (player.respawnTimer <= 0) {
                if (getDistance(b.x, b.y, player.x, player.y) < player.radius) {
                    player.takeDamage(b.damage, b.team);
                    updateHUD();
                    hitTarget = true;
                }
            }
            if (!hitTarget) {
                for (let j = 0; j < bots.length; j++) {
                    const bot = bots[j];
                    if (bot.respawnTimer <= 0 && bot.team === TEAM_RED) {
                        if (getDistance(b.x, b.y, bot.x, bot.y) < bot.radius) {
                            bot.takeDamage(b.damage, b.team);
                            hitTarget = true;
                            break;
                        }
                    }
                }
            }
        }

        if (hitTarget) {
            if (b.type === 'plasma') {
                explodePlasma(b.x, b.y, b.team);
            } else {
                spawnExplosion(b.x, b.y, b.color, 8, 3);
            }
            bullets.splice(i, 1);
        }
    }

    // Plasma Explosive Blast Area
    function explodePlasma(x, y, attackerTeam) {
        sfx.playPlasmaExplode();
        spawnExplosion(x, y, '#ff9900', 40, 8); // Huge splash visuals
        
        // Push shockwave ring
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI*2;
            particles.push(new Particle(x, y, 'rgba(255, 153, 0, 0.4)', 15, Math.cos(angle)*5, Math.sin(angle)*5, 12, 'smoke'));
        }

        // Deal damage in radius
        const radius = 130;
        const splashDmg = WEAPONS.legendary.damage;

        // Player check
        if (attackerTeam === TEAM_BLUE && player.respawnTimer <= 0) {
            const dist = getDistance(x, y, player.x, player.y);
            if (dist < radius + player.radius) {
                const ratio = 1 - (dist / (radius + player.radius));
                player.takeDamage(Math.floor(splashDmg * ratio), attackerTeam);
                updateHUD();
            }
        }

        // Bots checks
        bots.forEach(bot => {
            if (bot.respawnTimer <= 0) {
                const dist = getDistance(x, y, bot.x, bot.y);
                if (dist < radius + bot.radius) {
                    const ratio = 1 - (dist / (radius + bot.radius));
                    
                    // Don't deal friendly damage, only targets
                    if (bot.team !== attackerTeam) {
                        bot.takeDamage(Math.floor(splashDmg * ratio), attackerTeam);
                    }
                }
            }
        });
    }

    // Update Projectile Draw (Render bullets/missiles)
    bullets.forEach(b => {
        ctx.save();
        ctx.shadowBlur = b.type === 'plasma' ? 15 : 6;
        ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;

        if (b.type === 'missile') {
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            
            // Draw longer, realistic missile
            ctx.fillStyle = '#6a6b75'; // Grey metal fuselage
            ctx.fillRect(-12, -4, 20, 8);
            
            ctx.fillStyle = '#ff0033'; // Red explosive warhead nose cone
            ctx.beginPath();
            ctx.moveTo(8, -4);
            ctx.lineTo(16, 0);
            ctx.lineTo(8, 4);
            ctx.closePath();
            ctx.fill();

            // Fin stabilizers
            ctx.fillStyle = '#150f28';
            ctx.fillRect(-12, -7, 3, 3);
            ctx.fillRect(-12, 4, 3, 3);
        } else if (b.type === 'plasma') {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius - 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw linear tracer bullet
            ctx.strokeStyle = b.color;
            ctx.lineWidth = b.radius;
            ctx.lineCap = 'round';
            ctx.beginPath();
            
            // Draw line in velocity vector
            const speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
            const dx = (b.vx / speed) * 16;
            const dy = (b.vy / speed) * 16;
            
            ctx.moveTo(b.x - dx, b.y - dy);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        ctx.restore();
    });

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Update & Draw Floating texts
    for (let i = floatingCoins.length - 1; i >= 0; i--) {
        const ft = floatingCoins[i];
        ft.update();
        ft.draw(ctx);
        if (ft.life <= 0) {
            floatingCoins.splice(i, 1);
        }
    }

    // Check Flag pick-ups / scores collisions
    handleFlagsCTF();

    // Render Red & Blue Flags
    drawFlag(ctx, flags.red);
    drawFlag(ctx, flags.blue);

    ctx.restore(); // Restore Camera context

    // Draw touch joysticks on top (screen space)
    drawJoysticks(ctx);

    // Check matching end conditions
    checkMatchFinished();

    requestAnimationFrame(updateAndRender);
}

// Draw twin-stick visual overlays on touchscreen devices
function drawJoysticks(ctx) {
    if (!touchDevice) return;

    if (leftJoystick.active) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        // Outer boundary ring
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2fe';
        ctx.beginPath();
        ctx.arc(leftJoystick.startX, leftJoystick.startY, 60, 0, Math.PI * 2);
        ctx.stroke();

        // Inner translucent background
        ctx.fillStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.beginPath();
        ctx.arc(leftJoystick.startX, leftJoystick.startY, 60, 0, Math.PI * 2);
        ctx.fill();

        // Joystick knob handle
        const dx = leftJoystick.curX - leftJoystick.startX;
        const dy = leftJoystick.curY - leftJoystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const knobX = leftJoystick.startX + Math.cos(angle) * Math.min(dist, 60);
        const knobY = leftJoystick.startY + Math.sin(angle) * Math.min(dist, 60);

        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (rightJoystick.active) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        // Outer boundary ring
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff007f';
        ctx.beginPath();
        ctx.arc(rightJoystick.startX, rightJoystick.startY, 60, 0, Math.PI * 2);
        ctx.stroke();

        // Inner translucent background
        ctx.fillStyle = 'rgba(255, 0, 127, 0.05)';
        ctx.beginPath();
        ctx.arc(rightJoystick.startX, rightJoystick.startY, 60, 0, Math.PI * 2);
        ctx.fill();

        // Joystick knob handle
        const dx = rightJoystick.curX - rightJoystick.startX;
        const dy = rightJoystick.curY - rightJoystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const knobX = rightJoystick.startX + Math.cos(angle) * Math.min(dist, 60);
        const knobY = rightJoystick.startY + Math.sin(angle) * Math.min(dist, 60);

        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Capture the Flag logic details ---
function handleFlagsCTF() {
    const redBase = BASES.red;
    const blueBase = BASES.blue;

    // --- Red Flag Mechanics ---
    if (flags.red.status !== 'stolen') {
        // Any Blue bot can pick up Red Flag
        bots.forEach(bot => {
            if (bot.team === TEAM_BLUE && bot.respawnTimer <= 0) {
                if (getDistance(bot.x, bot.y, flags.red.x, flags.red.y) < 35) {
                    flags.red.carrier = bot;
                    flags.red.status = 'stolen';
                    sfx.playFlagStolen();
                    addWarningBanner("BLUE TEAM STOLE THE RED FLAG!");
                    updateHUD();
                }
            }
        });
    } else {
        // Red flag is stolen. Move it to carrier coordinate
        const carrier = flags.red.carrier;
        if (carrier) {
            flags.red.x = carrier.x;
            flags.red.y = carrier.y;

            // Check if carrier has reached their Blue base pad to SCORE!
            if (getDistance(carrier.x, carrier.y, blueBase.x, blueBase.y) < blueBase.radius) {
                // Score only if Blue's own flag is at home base
                if (flags.blue.status === 'home') {
                    score.blue++;
                    sfx.playFlagScored();
                    addWarningBanner("BLUE TEAM SCORED!");
                    resetFlags();
                    updateHUD();
                }
            }
        }
    }

    // If Red Flag is dropped, Red team can touch to return it
    if (flags.red.status === 'dropped') {
        // Player return check
        if (player.respawnTimer <= 0 && getDistance(player.x, player.y, flags.red.x, flags.red.y) < 35) {
            returnRedFlag();
        }
        
        // Red bots return check
        bots.forEach(bot => {
            if (bot.team === TEAM_RED && bot.respawnTimer <= 0) {
                if (getDistance(bot.x, bot.y, flags.red.x, flags.red.y) < 35) {
                    returnRedFlag();
                }
            }
        });
    }

    function returnRedFlag() {
        flags.red.status = 'home';
        flags.red.carrier = null;
        flags.red.x = flags.red.homeX;
        flags.red.y = flags.red.homeY;
        sfx.playFlagReturned();
        addWarningBanner("RED FLAG RETURNED TO BASE!");
        updateHUD();
    }


    // --- Blue Flag Mechanics ---
    if (flags.blue.status !== 'stolen') {
        // Player can pick it up
        if (player.respawnTimer <= 0 && getDistance(player.x, player.y, flags.blue.x, flags.blue.y) < 35) {
            flags.blue.carrier = player;
            flags.blue.status = 'stolen';
            sfx.playFlagStolen();
            addWarningBanner("YOU STOLE THE BLUE FLAG! RUN TO BASE!");
            updateHUD();
        }

        // Red bots can pick it up
        bots.forEach(bot => {
            if (bot.team === TEAM_RED && bot.respawnTimer <= 0) {
                if (getDistance(bot.x, bot.y, flags.blue.x, flags.blue.y) < 35) {
                    flags.blue.carrier = bot;
                    flags.blue.status = 'stolen';
                    sfx.playFlagStolen();
                    addWarningBanner("RED TEAM STOLE THE BLUE FLAG!");
                    updateHUD();
                }
            }
        });
    } else {
        // Blue flag is stolen
        const carrier = flags.blue.carrier;
        if (carrier) {
            flags.blue.x = carrier.x;
            flags.blue.y = carrier.y;

            // Check if carrier reached Red Base to score!
            if (getDistance(carrier.x, carrier.y, redBase.x, redBase.y) < redBase.radius) {
                if (flags.red.status === 'home') {
                    score.red++;
                    sfx.playFlagScored();
                    addWarningBanner("RED TEAM SCORED!");
                    
                    if (carrier.isPlayer) {
                        stats.flagsCaptured++;
                    }
                    
                    resetFlags();
                    updateHUD();
                }
            }
        }
    }

    // If Blue Flag is dropped, Blue bots can touch to return it
    if (flags.blue.status === 'dropped') {
        bots.forEach(bot => {
            if (bot.team === TEAM_BLUE && bot.respawnTimer <= 0) {
                if (getDistance(bot.x, bot.y, flags.blue.x, flags.blue.y) < 35) {
                    flags.blue.status = 'home';
                    flags.blue.carrier = null;
                    flags.blue.x = flags.blue.homeX;
                    flags.blue.y = flags.blue.homeY;
                    sfx.playFlagReturned();
                    addWarningBanner("BLUE FLAG RETURNED TO BASE!");
                    updateHUD();
                }
            }
        });
    }
}

function resetFlags() {
    flags.red.status = 'home';
    flags.red.carrier = null;
    flags.red.x = flags.red.homeX;
    flags.red.y = flags.red.homeY;

    flags.blue.status = 'home';
    flags.blue.carrier = null;
    flags.blue.x = flags.blue.homeX;
    flags.blue.y = flags.blue.homeY;
}

// --- HUD UI Rendering / Updates ---
function updateHUD() {
    // Scores
    scoreRed.innerText = `RED: ${score.red}`;
    scoreBlue.innerText = `BLUE: ${score.blue}`;

    // Health UI
    const hpPct = player.respawnTimer > 0 ? 0 : Math.max(0, player.health / player.maxHealth);
    healthBar.style.width = `${hpPct * 100}%`;
    healthText.innerText = `${Math.ceil(hpPct * 100)}%`;

    // Colors flashing on warning
    healthBar.className = "health-bar-fill";
    if (hpPct < 0.25) {
        healthBar.classList.add('critical');
    } else if (hpPct < 0.6) {
        healthBar.classList.add('warning');
    }

    // Wallet / shop
    walletBalance.innerText = `$${wallet}`;
    shopWalletBalance.innerText = `$${wallet}`;

    // Weapon tags
    const activeWep = WEAPONS[equippedWeapon];
    weaponName.innerText = activeWep.name;
    weaponRarity.innerText = activeWep.rarity;
    
    // Reset rarity CSS badge class
    weaponRarity.className = `rarity-badge ${activeWep.rarity}`;

    // Flag status texts
    redFlagStatus.innerText = flags.red.status === 'home' ? '🔴 RED FLAG: AT BASE' : 
                             (flags.red.status === 'dropped' ? '🔴 RED FLAG: DROPPED!' : '🔴 RED FLAG: STOLEN!');
    redFlagStatus.className = `flag-status ${flags.red.status}`;

    blueFlagStatus.innerText = flags.blue.status === 'home' ? '🔵 BLUE FLAG: AT BASE' : 
                              (flags.blue.status === 'dropped' ? '🔵 BLUE FLAG: DROPPED!' : '🔵 BLUE FLAG: STOLEN!');
    blueFlagStatus.className = `flag-status ${flags.blue.status}`;

    // Update shop item buy buttons styles
    Object.keys(WEAPONS).forEach(key => {
        const w = WEAPONS[key];
        const card = document.getElementById(`item-${key}`);
        if (!card) return;
        const btn = card.querySelector('.btn-buy');
        
        if (equippedWeapon === key) {
            card.classList.add('active');
            btn.innerText = 'EQUIPPED';
        } else {
            card.classList.remove('active');
            if (purchasedWeapons.includes(key)) {
                btn.innerText = 'EQUIP';
                btn.style.borderColor = `var(--color-${w.rarity})`;
                btn.style.color = `var(--color-${w.rarity})`;
            } else {
                btn.innerText = `BUY $${w.price}`;
                if (wallet < w.price) {
                    btn.style.opacity = '0.5';
                } else {
                    btn.style.opacity = '1.0';
                }
            }
        }
    });
}

// --- Menu Options and Start Triggers ---
function startMatch() {
    // Reset matches state
    score.red = 0;
    score.blue = 0;
    // Keep persistent wallet and weapons across matches
    stats = { kills: 0, deaths: 0, flagsCaptured: 0, coinsEarned: 0 };

    bullets = [];
    particles = [];
    floatingCoins = [];
    resetFlags();

    // Spawn player
    player = new Unit(BASES.red.x, BASES.red.y, TEAM_RED, true);

    // Spawn 3 friendly Bots
    bots = [];
    bots.push(new Unit(BASES.red.x - 40, BASES.red.y - 60, TEAM_RED, false, 'defender'));
    bots.push(new Unit(BASES.red.x - 40, BASES.red.y + 60, TEAM_RED, false, 'attacker'));
    bots.push(new Unit(BASES.red.x - 80, BASES.red.y, TEAM_RED, false, 'chaser'));

    // Spawn 4 enemy Blue bots
    bots.push(new Unit(BASES.blue.x + 40, BASES.blue.y - 60, TEAM_BLUE, false, 'defender'));
    bots.push(new Unit(BASES.blue.x + 40, BASES.blue.y + 60, TEAM_BLUE, false, 'attacker'));
    bots.push(new Unit(BASES.blue.x + 80, BASES.blue.y, TEAM_BLUE, false, 'chaser'));
    // Additional chaser to make it harder
    bots.push(new Unit(BASES.blue.x + 100, BASES.blue.y - 100, TEAM_BLUE, false, 'chaser'));

    menuOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameHud.classList.remove('hud-hidden');
    shopOverlay.classList.add('shop-hidden');

    sfx.resume();
    
    // Toggle on game loop
    matchActive = true;
    lastTime = 0;
    updateHUD();
    requestAnimationFrame(updateAndRender);
}

// --- Keyboard, Mouse Event Listeners Setup ---
function setupEventListeners() {
    // Canvas sizing setup
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Keyboard downs
    window.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        keys[key] = true;

        // B and P toggle weapon shop
        if (key === 'b' || key === 'p') {
            if (matchActive && gameOverOverlay.classList.contains('hidden')) {
                toggleShop();
            }
        }

        // Space triggers standard gun fire
        if (key === ' ' && matchActive && !shopOverlay.classList.contains('shop-active')) {
            firePlayerWeapon();
            e.preventDefault();
        }

        // M key down: start rapid fire timer
        if (key === 'm' && matchActive && !mKeyInterval) {
            spawnMKeyMissile();
            mKeyInterval = setInterval(spawnMKeyMissile, 1); // 1ms super fast repeat rate!
        }
        
        // 1 & 2 controls mapping for up & down movement
        if (key === '1') keys['w'] = true;
        if (key === '2') keys['s'] = true;
    });

    window.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        keys[key] = false;

        if (key === 'm') {
            if (mKeyInterval) {
                clearInterval(mKeyInterval);
                mKeyInterval = null;
            }
        }

        if (key === '1') keys['w'] = false;
        if (key === '2') keys['s'] = false;
    });

    // Mouse aiming & moves
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) { // left click
            mouse.isDown = true;
            if (matchActive && !shopOverlay.classList.contains('shop-active')) {
                firePlayerWeapon();
            }
        }
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouse.isDown = false;
        }
    });

    // Button Starts
    btnStart.addEventListener('click', () => {
        sfx.init();
        startMatch();
    });
    btnRestart.addEventListener('click', startMatch);
    btnMainMenu.addEventListener('click', () => {
        gameOverOverlay.classList.add('hidden');
        menuOverlay.classList.remove('hidden');
    });

    // Audio Toggle button
    btnAudioToggle.addEventListener('click', () => {
        sfx.init();
        const isMuted = sfx.toggleMute();
        btnAudioToggle.innerText = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
    });

    // Shop hud triggers
    btnShopToggle.addEventListener('click', toggleShop);
    btnShopClose.addEventListener('click', toggleShop);

    // Shop item transaction clicks
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', e => {
            const itemKey = btn.getAttribute('data-item');
            const price = parseInt(btn.getAttribute('data-price'));

            if (purchasedWeapons.includes(itemKey)) {
                // Simply Equip
                equippedWeapon = itemKey;
                sfx.playFlagReturned(); // play select sound
                saveGameData();
                updateHUD();
            } else {
                // Try to buy
                if (wallet >= price) {
                    wallet -= price;
                    purchasedWeapons.push(itemKey);
                    equippedWeapon = itemKey;
                    sfx.playCoin(); // Play purchase sound
                    saveGameData();
                    updateHUD();
                } else {
                    // Cannot afford
                    addWarningBanner("INSUFFICIENT CREDITS!");
                    sfx.playDeath();
                }
            }
        });
    });

    // Touchscreen / Mobile Controls listeners
    canvas.addEventListener('touchstart', e => {
        touchDevice = true;
        sfx.resume(); // Ensure Audio Context is active on user touch

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            // Split controls by screen halves
            if (clientX < window.innerWidth / 2) {
                if (!leftJoystick.active) {
                    leftJoystick.active = true;
                    leftJoystick.startX = clientX;
                    leftJoystick.startY = clientY;
                    leftJoystick.curX = clientX;
                    leftJoystick.curY = clientY;
                    leftTouchId = touch.identifier;
                }
            } else {
                if (!rightJoystick.active) {
                    rightJoystick.active = true;
                    rightJoystick.startX = clientX;
                    rightJoystick.startY = clientY;
                    rightJoystick.curX = clientX;
                    rightJoystick.curY = clientY;
                    rightTouchId = touch.identifier;
                }
            }
        }
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        touchDevice = true;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === leftTouchId) {
                leftJoystick.curX = touch.clientX;
                leftJoystick.curY = touch.clientY;
            } else if (touch.identifier === rightTouchId) {
                rightJoystick.curX = touch.clientX;
                rightJoystick.curY = touch.clientY;
            }
        }
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === leftTouchId) {
                leftJoystick.active = false;
                leftTouchId = null;
            } else if (touch.identifier === rightTouchId) {
                rightJoystick.active = false;
                rightTouchId = null;
            }
        }
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchcancel', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === leftTouchId) {
                leftJoystick.active = false;
                leftTouchId = null;
            } else if (touch.identifier === rightTouchId) {
                rightJoystick.active = false;
                rightTouchId = null;
            }
        }
        e.preventDefault();
    }, { passive: false });
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function toggleShop() {
    if (shopOverlay.classList.contains('shop-hidden')) {
        shopOverlay.classList.remove('shop-hidden');
        shopOverlay.classList.add('shop-active');
    } else {
        shopOverlay.classList.add('shop-hidden');
        shopOverlay.classList.remove('shop-active');
    }
    updateHUD();
}

// --- Boot Start ---
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    setupEventListeners();
});
