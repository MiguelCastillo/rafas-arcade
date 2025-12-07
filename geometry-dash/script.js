// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 900;
canvas.height = 500;

// Game Constants
const GRAVITY = 0.45;
const JUMP_FORCE = -16;
const GROUND_HEIGHT = 80;
const GAME_SPEED_INITIAL = 6;
const GAME_SPEED_INCREMENT = 0.001;

// Game State
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('geometryJumpHighScore') || 0;
let gameSpeed = GAME_SPEED_INITIAL;
let distanceTraveled = 0;

// Checkpoint system - every 10 score
const CHECKPOINT_SCORE_INTERVAL = 10;
let checkpoints = [];
let lastCheckpoint = null;
let checkpointScore = 0;
let checkpointSpeed = GAME_SPEED_INITIAL;
let nextCheckpointScore = CHECKPOINT_SCORE_INTERVAL;

// Level system
const PORTAL_SCORE_INTERVAL = 30;
let currentLevel = 0;
let portals = [];
let nextPortalScore = PORTAL_SCORE_INTERVAL;
let levelTransitioning = false;

// Level definitions - each level has unique theme
const LEVELS = [
    {
        name: "NEON NIGHTS",
        background: ['#1a0a2e', '#2d1b4e', '#4a1a6b', '#6b2a8a'],
        groundColor: ['#ff6b35', '#e55a2b', '#cc4420'],
        groundLine: '#ffcc00',
        spikeColor: '#ff4444',
        spikeHighlight: '#ff6666',
        blockColor: '#6633cc',
        blockHighlight: '#8855ee',
        sawColor: '#ff6600',
        starColor: 'white'
    },
    {
        name: "CYBER OCEAN",
        background: ['#0a1628', '#0d2847', '#104a6e', '#1a6b8a'],
        groundColor: ['#00d4aa', '#00b894', '#00a381'],
        groundLine: '#00ffcc',
        spikeColor: '#00ffff',
        spikeHighlight: '#66ffff',
        blockColor: '#0077aa',
        blockHighlight: '#00aadd',
        sawColor: '#00ff88',
        starColor: '#00ffff'
    },
    {
        name: "INFERNO",
        background: ['#1a0500', '#3d0a00', '#6b1500', '#8a2000'],
        groundColor: ['#ff4400', '#dd3300', '#bb2200'],
        groundLine: '#ffff00',
        spikeColor: '#ffaa00',
        spikeHighlight: '#ffcc44',
        blockColor: '#aa2200',
        blockHighlight: '#dd4422',
        sawColor: '#ff0000',
        starColor: '#ff6600'
    },
    {
        name: "MATRIX",
        background: ['#000a00', '#001500', '#002200', '#003300'],
        groundColor: ['#00aa00', '#008800', '#006600'],
        groundLine: '#00ff00',
        spikeColor: '#00ff00',
        spikeHighlight: '#66ff66',
        blockColor: '#004400',
        blockHighlight: '#006600',
        sawColor: '#00ff44',
        starColor: '#00ff00'
    },
    {
        name: "FROST REALM",
        background: ['#0a0a1a', '#151530', '#202050', '#2a2a70'],
        groundColor: ['#4488ff', '#3377dd', '#2266bb'],
        groundLine: '#aaddff',
        spikeColor: '#88ccff',
        spikeHighlight: '#aaeeff',
        blockColor: '#2255aa',
        blockHighlight: '#4477cc',
        sawColor: '#66bbff',
        starColor: '#aaccff'
    },
    {
        name: "VOID",
        background: ['#000000', '#0a0a0a', '#151515', '#1a1a1a'],
        groundColor: ['#333333', '#2a2a2a', '#222222'],
        groundLine: '#ffffff',
        spikeColor: '#ffffff',
        spikeHighlight: '#cccccc',
        blockColor: '#1a1a1a',
        blockHighlight: '#333333',
        sawColor: '#888888',
        starColor: '#444444'
    }
];

// Player
const player = {
    x: 100,
    y: canvas.height - GROUND_HEIGHT - 50,
    width: 50,
    height: 50,
    velocityY: 0,
    isOnGround: true,
    rotation: 0,
    isJumping: false,
    jumpHoldTime: 0,
    maxJumpHoldTime: 15  // Max frames to hold for full jump
};

// Obstacles
let obstacles = [];

// Obstacle patterns - each pattern is a function that returns an array of obstacle pieces
const OBSTACLE_PATTERNS = [
    // Single spike
    () => [{ offsetX: 0, width: 35, height: 50, type: 'spike' }],
    
    // Double spike
    () => [
        { offsetX: 0, width: 35, height: 50, type: 'spike' },
        { offsetX: 40, width: 35, height: 50, type: 'spike' }
    ],
    
    // Tall spike
    () => [{ offsetX: 0, width: 40, height: 80, type: 'spike' }],
    
    // Low block
    () => [{ offsetX: 0, width: 60, height: 35, type: 'block' }],
    
    // Staircase up (3 steps) - with long elevated floor with obstacles
    () => [
        { offsetX: 0, width: 50, height: 25, type: 'block' },
        { offsetX: 120, width: 50, height: 50, type: 'block' },
        { offsetX: 240, width: 50, height: 75, type: 'block' },
        { offsetX: 360, width: 600, height: 75, type: 'block' },  // Long elevated floor
        { offsetX: 500, width: 30, height: 40, type: 'spike', elevated: 75 },
        { offsetX: 750, width: 40, height: 40, type: 'saw', elevated: 75 }
    ],
    
    // Staircase down (3 steps) - starts from long elevated floor with obstacles
    () => [
        { offsetX: 0, width: 600, height: 75, type: 'block' },   // Long elevated floor
        { offsetX: 150, width: 30, height: 40, type: 'spike', elevated: 75 },
        { offsetX: 400, width: 40, height: 40, type: 'saw', elevated: 75 },
        { offsetX: 670, width: 50, height: 75, type: 'block' },
        { offsetX: 790, width: 50, height: 50, type: 'block' },
        { offsetX: 910, width: 50, height: 25, type: 'block' }
    ],
    
    // Pyramid - with gaps to jump between
    () => [
        { offsetX: 0, width: 45, height: 40, type: 'block' },
        { offsetX: 110, width: 45, height: 70, type: 'block' },
        { offsetX: 220, width: 45, height: 40, type: 'block' }
    ],
    
    // Block with spike on top
    () => [
        { offsetX: 0, width: 50, height: 40, type: 'block' },
        { offsetX: 7, width: 35, height: 45, type: 'spike', elevated: 40 }
    ],
    
    // Wide wall
    () => [{ offsetX: 0, width: 30, height: 90, type: 'block' }],
    
    // Gap jump (two pillars)
    () => [
        { offsetX: 0, width: 35, height: 60, type: 'block' },
        { offsetX: 120, width: 35, height: 60, type: 'block' }
    ],
    
    // Saw blade (circle-ish)
    () => [{ offsetX: 0, width: 50, height: 50, type: 'saw' }],
    
    // Long staircase (5 steps) - with extra long elevated floor with obstacles
    () => [
        { offsetX: 0, width: 45, height: 20, type: 'block' },
        { offsetX: 100, width: 45, height: 35, type: 'block' },
        { offsetX: 200, width: 45, height: 50, type: 'block' },
        { offsetX: 300, width: 45, height: 65, type: 'block' },
        { offsetX: 400, width: 45, height: 80, type: 'block' },
        { offsetX: 515, width: 750, height: 80, type: 'block' },  // Extra long elevated floor
        { offsetX: 700, width: 30, height: 35, type: 'spike', elevated: 80 },
        { offsetX: 1000, width: 45, height: 45, type: 'saw', elevated: 80 }
    ],
    
    // Spike sandwich
    () => [
        { offsetX: 0, width: 30, height: 55, type: 'spike' },
        { offsetX: 35, width: 50, height: 30, type: 'block' },
        { offsetX: 90, width: 30, height: 55, type: 'spike' }
    ],
    
    // Launch pad
    () => [{ offsetX: 0, width: 60, height: 15, type: 'pad' }],
    
    // Launch pad before tall obstacle
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 200, width: 40, height: 100, type: 'block' }
    ],
    
    // Double launch pads with safe platform
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 180, width: 120, height: 40, type: 'block' },  // Safe landing between pads
        { offsetX: 230, width: 60, height: 15, type: 'pad', elevated: 40 }
    ],
    
    // Launch pad to elevated platform
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 180, width: 80, height: 90, type: 'block' }
    ],
    
    // Launch pad over spikes to safe platform
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 100, width: 35, height: 70, type: 'spike' },
        { offsetX: 140, width: 35, height: 70, type: 'spike' },
        { offsetX: 220, width: 150, height: 50, type: 'block' }  // Safe landing platform
    ],
    
    // Platform with spike on edge
    () => [
        { offsetX: 0, width: 150, height: 50, type: 'block' },
        { offsetX: 150, width: 30, height: 45, type: 'spike', elevated: 50 }
    ],
    
    // Spike tunnel (jump over low platform between spikes)
    () => [
        { offsetX: 0, width: 30, height: 60, type: 'spike' },
        { offsetX: 80, width: 100, height: 25, type: 'block' },
        { offsetX: 230, width: 30, height: 60, type: 'spike' }
    ],
    
    // Elevated platform run with gap and obstacles
    () => [
        { offsetX: 0, width: 360, height: 60, type: 'block' },
        { offsetX: 100, width: 30, height: 35, type: 'spike', elevated: 60 },
        { offsetX: 250, width: 30, height: 35, type: 'spike', elevated: 60 },
        { offsetX: 480, width: 360, height: 60, type: 'block' },
        { offsetX: 620, width: 40, height: 40, type: 'saw', elevated: 60 }
    ],
    
    // Long saw platform
    () => [
        { offsetX: 0, width: 450, height: 50, type: 'block' },
        { offsetX: 100, width: 50, height: 50, type: 'saw', elevated: 50 },
        { offsetX: 300, width: 50, height: 50, type: 'saw', elevated: 50 }
    ],
    
    // Triple platform hop with long end platform
    () => [
        { offsetX: 0, width: 60, height: 40, type: 'block' },
        { offsetX: 130, width: 60, height: 55, type: 'block' },
        { offsetX: 260, width: 60, height: 70, type: 'block' },
        { offsetX: 390, width: 450, height: 70, type: 'block' },
        { offsetX: 480, width: 30, height: 35, type: 'spike', elevated: 70 },
        { offsetX: 580, width: 40, height: 40, type: 'saw', elevated: 70 },
        { offsetX: 700, width: 30, height: 35, type: 'spike', elevated: 70 }
    ],
    
    // Long spike row on platform
    () => [
        { offsetX: 0, width: 600, height: 40, type: 'block' },
        { offsetX: 150, width: 25, height: 35, type: 'spike', elevated: 40 },
        { offsetX: 400, width: 40, height: 40, type: 'saw', elevated: 40 }
    ],
    
    // Launch pad to long double platform with obstacles
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 180, width: 400, height: 100, type: 'block' },
        { offsetX: 450, width: 30, height: 35, type: 'spike', elevated: 100 },  // Spike moved away from landing zone
        { offsetX: 650, width: 240, height: 60, type: 'block' },
        { offsetX: 800, width: 40, height: 40, type: 'saw', elevated: 60 }
    ],
    
    // Zigzag platforms
    () => [
        { offsetX: 0, width: 70, height: 30, type: 'block' },
        { offsetX: 140, width: 70, height: 60, type: 'block' },
        { offsetX: 280, width: 70, height: 30, type: 'block' },
        { offsetX: 420, width: 70, height: 60, type: 'block' }
    ],
    
    // Saws and spikes combo
    () => [
        { offsetX: 0, width: 40, height: 40, type: 'saw' },
        { offsetX: 150, width: 30, height: 50, type: 'spike' }
    ],
    
    // Platform bridge with danger below
    () => [
        { offsetX: 0, width: 80, height: 80, type: 'block' },
        { offsetX: 85, width: 30, height: 40, type: 'spike' },
        { offsetX: 120, width: 30, height: 40, type: 'spike' },
        { offsetX: 155, width: 80, height: 80, type: 'block' }
    ],
    
    // Launch pad chain with long platforms (safe landings)
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 200, width: 300, height: 70, type: 'block' },
        { offsetX: 380, width: 30, height: 32, type: 'spike', elevated: 70 },  // Spike away from landing
        { offsetX: 430, width: 60, height: 15, type: 'pad', elevated: 70 },
        { offsetX: 650, width: 400, height: 120, type: 'block' },
        { offsetX: 900, width: 30, height: 35, type: 'spike', elevated: 120 }  // Spike away from landing
    ],
    
    // Double spike
    () => [
        { offsetX: 0, width: 25, height: 45, type: 'spike' },
        { offsetX: 60, width: 25, height: 45, type: 'spike' }
    ],
    
    // Long elevated saw run
    () => [
        { offsetX: 0, width: 750, height: 50, type: 'block' },
        { offsetX: 150, width: 40, height: 40, type: 'saw', elevated: 50 },
        { offsetX: 500, width: 30, height: 35, type: 'spike', elevated: 50 }
    ],
    
    // Step up with spikes
    () => [
        { offsetX: 0, width: 30, height: 50, type: 'spike' },
        { offsetX: 80, width: 70, height: 40, type: 'block' },
        { offsetX: 200, width: 70, height: 70, type: 'block' },
        { offsetX: 270, width: 25, height: 35, type: 'spike', elevated: 70 }
    ],
    
    // Multi-level platforms with obstacles
    () => [
        { offsetX: 0, width: 300, height: 30, type: 'block' },
        { offsetX: 80, width: 28, height: 32, type: 'spike', elevated: 30 },
        { offsetX: 180, width: 28, height: 32, type: 'spike', elevated: 30 },
        { offsetX: 150, width: 300, height: 60, type: 'block' },
        { offsetX: 250, width: 35, height: 35, type: 'saw', elevated: 60 },
        { offsetX: 370, width: 28, height: 32, type: 'spike', elevated: 60 },
        { offsetX: 300, width: 300, height: 90, type: 'block' },
        { offsetX: 400, width: 28, height: 32, type: 'spike', elevated: 90 },
        { offsetX: 500, width: 35, height: 35, type: 'saw', elevated: 90 }
    ],
    
    // Spike platform spike
    () => [
        { offsetX: 0, width: 35, height: 55, type: 'spike' },
        { offsetX: 100, width: 100, height: 45, type: 'block' },
        { offsetX: 265, width: 35, height: 55, type: 'spike' }
    ],
    
    // High platform with pad - long platform with obstacles (safe landing)
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 200, width: 500, height: 110, type: 'block' },
        { offsetX: 450, width: 30, height: 35, type: 'spike', elevated: 110 },  // Spike away from landing
        { offsetX: 580, width: 45, height: 45, type: 'saw', elevated: 110 }
    ],
    
    // Low ceiling run (block above)
    () => [
        { offsetX: 0, width: 30, height: 50, type: 'spike' },
        { offsetX: 100, width: 30, height: 50, type: 'spike' }
    ],
    
    // Double saw
    () => [
        { offsetX: 0, width: 45, height: 45, type: 'saw' },
        { offsetX: 150, width: 45, height: 45, type: 'saw' }
    ],
    
    // Platform hop over spike pit
    () => [
        { offsetX: 0, width: 80, height: 50, type: 'block' },
        { offsetX: 100, width: 25, height: 40, type: 'spike' },
        { offsetX: 135, width: 25, height: 40, type: 'spike' },
        { offsetX: 180, width: 80, height: 50, type: 'block' }
    ],
    
    // Tower climb with long top platform (safe landings)
    () => [
        { offsetX: 0, width: 60, height: 15, type: 'pad' },
        { offsetX: 150, width: 200, height: 50, type: 'block' },
        { offsetX: 280, width: 60, height: 15, type: 'pad', elevated: 50 },  // Removed spike before pad
        { offsetX: 450, width: 500, height: 130, type: 'block' },
        { offsetX: 700, width: 30, height: 35, type: 'spike', elevated: 130 },  // Spike away from landing
        { offsetX: 850, width: 40, height: 40, type: 'saw', elevated: 130 }
    ],
    
    // Extra wide platform with hazards
    () => [
        { offsetX: 0, width: 900, height: 45, type: 'block' },
        { offsetX: 200, width: 35, height: 40, type: 'saw', elevated: 45 },
        { offsetX: 600, width: 30, height: 35, type: 'spike', elevated: 45 }
    ],
    
    // Ceiling spike pair
    () => [
        { offsetX: 0, width: 30, height: 45, type: 'spike', ceiling: true },
        { offsetX: 100, width: 30, height: 45, type: 'spike', ceiling: true }
    ],
    
    // Ceiling and floor spikes (narrow path)
    () => [
        { offsetX: 0, width: 32, height: 45, type: 'spike', ceiling: true },
        { offsetX: 100, width: 32, height: 45, type: 'spike' }
    ],
    
    // Double ceiling spike
    () => [
        { offsetX: 0, width: 28, height: 40, type: 'spike', ceiling: true },
        { offsetX: 120, width: 28, height: 40, type: 'spike', ceiling: true }
    ],
    
    // Ceiling saw
    () => [
        { offsetX: 0, width: 50, height: 50, type: 'saw', ceiling: true },
        { offsetX: 120, width: 50, height: 50, type: 'saw', ceiling: true }
    ],
    
    // Platform with ceiling spikes above
    () => [
        { offsetX: 0, width: 30, height: 55, type: 'spike', ceiling: true },
        { offsetX: 70, width: 30, height: 55, type: 'spike', ceiling: true },
        { offsetX: 20, width: 100, height: 40, type: 'block' }
    ],
    
    // Alternating ceiling and floor spikes
    () => [
        { offsetX: 0, width: 30, height: 50, type: 'spike' },
        { offsetX: 120, width: 30, height: 50, type: 'spike', ceiling: true }
    ]
];

// Particles
let particles = [];

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const playBtn = document.getElementById('playBtn');
const retryBtn = document.getElementById('retryBtn');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const finalScoreDisplay = document.getElementById('finalScore');

// Initialize high score display
highScoreDisplay.textContent = highScore;

// Track if space/jump is being held
let jumpKeyHeld = false;

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameRunning) {
            if (!jumpKeyHeld) {
                jump();
                jumpKeyHeld = true;
            }
        } else if (!startScreen.classList.contains('hidden')) {
            startGame();
        } else if (!gameOverScreen.classList.contains('hidden')) {
            restartGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        jumpKeyHeld = false;
        if (gameRunning && player.isJumping) {
            releaseJump();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameRunning) {
        if (!jumpKeyHeld) {
            jump();
            jumpKeyHeld = true;
        }
    }
});

canvas.addEventListener('mouseup', () => {
    jumpKeyHeld = false;
    if (gameRunning && player.isJumping) {
        releaseJump();
    }
});

playBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', restartGame);

// Touch support
document.addEventListener('touchstart', (e) => {
    if (gameRunning) {
        e.preventDefault();
        if (!jumpKeyHeld) {
            jump();
            jumpKeyHeld = true;
        }
    }
});

document.addEventListener('touchend', (e) => {
    jumpKeyHeld = false;
    if (gameRunning && player.isJumping) {
        releaseJump();
    }
});

function jump() {
    if (player.isOnGround) {
        player.velocityY = JUMP_FORCE * 0.6;  // Start with partial jump force
        player.isOnGround = false;
        player.isJumping = true;
        player.jumpHoldTime = 0;
        createJumpParticles();
    }
}

function releaseJump() {
    // When releasing early, reduce upward velocity for shorter jump
    if (player.isJumping && player.velocityY < 0) {
        player.velocityY *= 0.5;  // Cut velocity when releasing
    }
    player.isJumping = false;
}

function updateJumpHold() {
    // If holding jump and still rising, add more force
    if (jumpKeyHeld && player.isJumping && player.jumpHoldTime < player.maxJumpHoldTime) {
        player.velocityY += JUMP_FORCE * 0.035;  // Add force while holding
        player.jumpHoldTime++;
    }
    
    // Stop adding force once falling
    if (player.velocityY > 0) {
        player.isJumping = false;
    }
}

function createJumpParticles() {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 3 + 1,
            size: Math.random() * 6 + 2,
            color: '#ffcc00',
            alpha: 1,
            decay: 0.03
        });
    }
}

function createDeathParticles() {
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = Math.random() * 8 + 4;
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 10 + 5,
            color: i % 2 === 0 ? '#ffcc00' : '#ff6b35',
            alpha: 1,
            decay: 0.02
        });
    }
}

const CEILING_HEIGHT = 50; // Height of the permanent ceiling

function spawnObstacle() {
    const pattern = OBSTACLE_PATTERNS[Math.floor(Math.random() * OBSTACLE_PATTERNS.length)];
    const pieces = pattern();
    
    const minGap = 1000;
    const maxGap = 1500;
    const gap = Math.random() * (maxGap - minGap) + minGap;
    
    const lastObstacle = obstacles[obstacles.length - 1];
    const startX = lastObstacle ? lastObstacle.x + gap : canvas.width + 100;
    
    pieces.forEach(piece => {
        const elevation = piece.elevated || 0;
        let y;
        
        if (piece.ceiling) {
            // Ceiling objects hang from the permanent ceiling
            y = CEILING_HEIGHT; // Hang right below the ceiling
        } else {
            y = canvas.height - GROUND_HEIGHT - piece.height - elevation;
        }
        
        obstacles.push({
            x: startX + piece.offsetX,
            y: y,
            width: piece.width,
            height: piece.height,
            type: piece.type,
            passed: false,
            rotation: piece.type === 'saw' ? 0 : null,
            ceiling: piece.ceiling || false
        });
    });
}

function spawnCheckpoint() {
    checkpoints.push({
        x: canvas.width + 50,
        y: canvas.height - GROUND_HEIGHT - 80,
        width: 40,
        height: 80,
        activated: false,
        pulsePhase: 0
    });
}

function updateCheckpoints() {
    checkpoints.forEach(checkpoint => {
        checkpoint.x -= gameSpeed;
        checkpoint.pulsePhase += 0.1;
        
        // Activate checkpoint when player passes it
        if (!checkpoint.activated && 
            player.x > checkpoint.x + checkpoint.width / 2) {
            checkpoint.activated = true;
            lastCheckpoint = {
                distance: distanceTraveled,
                score: score,
                speed: gameSpeed,
                obstacleSnapshot: JSON.parse(JSON.stringify(obstacles.map(o => ({
                    relativeX: o.x - player.x,
                    y: o.y,
                    width: o.width,
                    height: o.height,
                    type: o.type,
                    passed: o.passed
                }))))
            };
            checkpointScore = score;
            checkpointSpeed = gameSpeed;
            createCheckpointParticles(checkpoint);
        }
    });
    
    // Remove off-screen checkpoints
    checkpoints = checkpoints.filter(cp => cp.x + cp.width > -50);
}

function createCheckpointParticles(checkpoint) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: checkpoint.x + checkpoint.width / 2,
            y: checkpoint.y + checkpoint.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 8 + 3,
            color: '#00ff88',
            alpha: 1,
            decay: 0.025
        });
    }
}

function drawCheckpoints() {
    checkpoints.forEach(checkpoint => {
        ctx.save();
        
        const pulse = Math.sin(checkpoint.pulsePhase) * 0.2 + 1;
        const glowColor = checkpoint.activated ? '#00ff88' : '#00ccff';
        
        // Glow effect
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = checkpoint.activated ? 30 : 20 * pulse;
        
        // Flag pole
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(checkpoint.x + 15, checkpoint.y, 6, checkpoint.height);
        
        // Flag
        ctx.fillStyle = checkpoint.activated ? '#00ff88' : '#00ccff';
        ctx.beginPath();
        ctx.moveTo(checkpoint.x + 21, checkpoint.y + 5);
        ctx.lineTo(checkpoint.x + 55, checkpoint.y + 20);
        ctx.lineTo(checkpoint.x + 21, checkpoint.y + 35);
        ctx.closePath();
        ctx.fill();
        
        // Checkpoint text
        ctx.shadowBlur = 0;
        ctx.fillStyle = checkpoint.activated ? '#00ff88' : 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(checkpoint.activated ? '✓' : 'CP', checkpoint.x + 20, checkpoint.y + checkpoint.height + 15);
        
        ctx.restore();
    });
}

// Portal functions
function spawnPortal() {
    portals.push({
        x: canvas.width + 100,
        y: canvas.height - GROUND_HEIGHT - 120,
        width: 60,
        height: 120,
        activated: false,
        phase: 0,
        targetLevel: (currentLevel + 1) % LEVELS.length
    });
}

function updatePortals() {
    portals.forEach(portal => {
        portal.x -= gameSpeed;
        portal.phase += 0.1;
        
        // Check if player enters portal
        if (!portal.activated &&
            player.x + player.width > portal.x + 15 &&
            player.x < portal.x + portal.width - 15 &&
            player.y + player.height > portal.y &&
            player.y < portal.y + portal.height) {
            
            portal.activated = true;
            triggerLevelTransition(portal.targetLevel);
        }
    });
    
    // Remove off-screen portals
    portals = portals.filter(p => p.x + p.width > -50);
}

function drawPortals() {
    portals.forEach(portal => {
        ctx.save();
        
        const nextLevel = LEVELS[portal.targetLevel];
        const pulse = Math.sin(portal.phase) * 0.3 + 1;
        const innerPulse = Math.sin(portal.phase * 2) * 0.2 + 0.8;
        
        // Outer glow
        ctx.shadowColor = nextLevel.groundLine;
        ctx.shadowBlur = 40 * pulse;
        
        // Portal frame
        ctx.strokeStyle = nextLevel.groundLine;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(
            portal.x + portal.width / 2,
            portal.y + portal.height / 2,
            portal.width / 2,
            portal.height / 2,
            0, 0, Math.PI * 2
        );
        ctx.stroke();
        
        // Inner swirl effect
        ctx.fillStyle = nextLevel.background[2];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(
            portal.x + portal.width / 2,
            portal.y + portal.height / 2,
            (portal.width / 2 - 8) * innerPulse,
            (portal.height / 2 - 8) * innerPulse,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Swirl lines
        ctx.globalAlpha = 1;
        ctx.strokeStyle = nextLevel.groundLine;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const angle = portal.phase + (i * Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(
                portal.x + portal.width / 2,
                portal.y + portal.height / 2,
                20 + i * 8,
                angle,
                angle + Math.PI * 0.5
            );
            ctx.stroke();
        }
        
        // Level name
        ctx.shadowBlur = 10;
        ctx.fillStyle = nextLevel.groundLine;
        ctx.font = 'bold 11px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(nextLevel.name, portal.x + portal.width / 2, portal.y - 10);
        
        ctx.restore();
    });
}

function triggerLevelTransition(newLevel) {
    levelTransitioning = true;
    currentLevel = newLevel;
    nextPortalScore = score + PORTAL_SCORE_INTERVAL;
    
    // Save checkpoint at level completion
    lastCheckpoint = {
        distance: distanceTraveled,
        score: score,
        speed: gameSpeed,
        level: currentLevel,
        obstacleSnapshot: []
    };
    checkpointScore = score;
    checkpointSpeed = gameSpeed;
    
    // Update CSS variables for ground color
    updateLevelVisuals();
    
    // Create transition particles
    createLevelTransitionParticles();
    
    // Clear obstacles ahead to give breathing room
    obstacles = obstacles.filter(o => o.x < player.x);
    
    setTimeout(() => {
        levelTransitioning = false;
    }, 500);
}

function updateLevelVisuals() {
    const level = LEVELS[currentLevel];
    const ground = document.querySelector('.ground');
    const ceiling = document.querySelector('.ceiling');
    const bgLayer = document.querySelector('.background-layer');
    
    if (!ground || !bgLayer) return;
    
    // Update ground colors
    ground.style.background = `linear-gradient(180deg, ${level.groundColor[0]} 0%, ${level.groundColor[1]} 50%, ${level.groundColor[2]} 100%)`;
    ground.style.boxShadow = `0 -5px 30px ${level.groundColor[0]}80`;
    
    // Update ground line using a child element instead of ::before
    let groundLine = ground.querySelector('.ground-line');
    if (!groundLine) {
        groundLine = document.createElement('div');
        groundLine.className = 'ground-line';
        groundLine.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 4px;';
        ground.appendChild(groundLine);
    }
    groundLine.style.background = level.groundLine;
    groundLine.style.boxShadow = `0 0 20px ${level.groundLine}`;
    
    // Update ceiling colors
    if (ceiling) {
        ceiling.style.background = `linear-gradient(180deg, ${level.groundColor[2]} 0%, ${level.groundColor[1]} 50%, ${level.groundColor[0]} 100%)`;
        ceiling.style.boxShadow = `0 5px 30px ${level.groundColor[0]}80`;
        
        let ceilingLine = ceiling.querySelector('.ceiling-line');
        if (!ceilingLine) {
            ceilingLine = document.createElement('div');
            ceilingLine.className = 'ceiling-line';
            ceilingLine.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100%; height: 4px;';
            ceiling.appendChild(ceilingLine);
        }
        ceilingLine.style.background = level.groundLine;
        ceilingLine.style.boxShadow = `0 0 20px ${level.groundLine}`;
    }
    
    // Update background
    bgLayer.style.background = `linear-gradient(180deg, ${level.background[0]} 0%, ${level.background[1]} 30%, ${level.background[2]} 60%, ${level.background[3]} 100%)`;
}

function createLevelTransitionParticles() {
    const level = LEVELS[currentLevel];
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: Math.random() * 12 + 4,
            color: level.groundLine,
            alpha: 1,
            decay: 0.02
        });
    }
}

function getCurrentLevel() {
    return LEVELS[currentLevel];
}

function updatePlayer() {
    // Update variable jump hold
    updateJumpHold();
    
    // Apply gravity
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // Ground collision
    const groundY = canvas.height - GROUND_HEIGHT - player.height;
    if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
        player.isOnGround = true;
        player.isJumping = false;
    }
    
    // Check for landing on blocks
    checkBlockLanding();
    
    // Rotation while jumping
    if (!player.isOnGround) {
        player.rotation += 0.1;
    } else {
        // Snap rotation to nearest 90 degrees
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }
}

function checkBlockLanding() {
    const padding = 5;
    let onAnyBlock = false;
    
    for (const obstacle of obstacles) {
        // Check if player is horizontally aligned with the obstacle
        const horizontalOverlap = 
            player.x + player.width - padding > obstacle.x &&
            player.x + padding < obstacle.x + obstacle.width;
        
        if (!horizontalOverlap) continue;
        
        const playerBottom = player.y + player.height;
        const obstacleTop = obstacle.y;
        
        // Handle launch pads
        if (obstacle.type === 'pad') {
            // Check if player is landing on or touching the pad
            if (player.velocityY >= 0 && 
                playerBottom >= obstacleTop && 
                playerBottom <= obstacleTop + player.velocityY + 15 &&
                player.y < obstacleTop) {
                
                // Launch the player!
                player.velocityY = -22; // Super jump!
                player.isOnGround = false;
                obstacle.activated = true; // For animation
                createPadParticles(obstacle);
            }
            continue;
        }
        
        // Only blocks can be landed on (not spikes or saws)
        if (obstacle.type !== 'block') continue;
        
        // Check if player is standing on this block
        if (Math.abs(playerBottom - obstacleTop) < 5 && player.velocityY >= 0) {
            player.y = obstacleTop - player.height;
            player.velocityY = 0;
            player.isOnGround = true;
            player.isJumping = false;
            onAnyBlock = true;
            continue;
        }
        
        // Check if player is landing on top (falling down onto the block)
        // Player must be falling (positive velocity) and near the top of the block
        if (player.velocityY > 0 && 
            playerBottom >= obstacleTop && 
            playerBottom <= obstacleTop + player.velocityY + 10 &&
            player.y < obstacleTop) {
            
            // Land on the block
            player.y = obstacleTop - player.height;
            player.velocityY = 0;
            player.isOnGround = true;
            player.isJumping = false;
            onAnyBlock = true;
        }
    }
    
    // If player was on a block but isn't anymore, and not on ground, start falling
    const groundY = canvas.height - GROUND_HEIGHT - player.height;
    if (!onAnyBlock && player.isOnGround && player.y < groundY - 5) {
        player.isOnGround = false;
    }
}

function createPadParticles(pad) {
    const level = getCurrentLevel();
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: pad.x + pad.width / 2 + (Math.random() - 0.5) * pad.width,
            y: pad.y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 8 - 4,
            size: Math.random() * 6 + 3,
            color: '#ffff00',
            alpha: 1,
            decay: 0.04
        });
    }
}

function updateObstacles() {
    // Move obstacles
    obstacles.forEach(obstacle => {
        obstacle.x -= gameSpeed;
        
        // Score when passing obstacle
        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
            obstacle.passed = true;
            score++;
            scoreDisplay.textContent = score;
        }
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > -50);
    
    // Spawn new obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 200) {
        spawnObstacle();
    }
}

function updateParticles() {
    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity on particles
        particle.alpha -= particle.decay;
    });
    
    particles = particles.filter(particle => particle.alpha > 0);
}

function checkCollisions() {
    const padding = 5;
    
    for (const obstacle of obstacles) {
        // Check basic AABB collision
        const colliding = 
            player.x + padding < obstacle.x + obstacle.width &&
            player.x + player.width - padding > obstacle.x &&
            player.y + padding < obstacle.y + obstacle.height &&
            player.y + player.height - padding > obstacle.y;
        
        if (!colliding) continue;
        
        // Pads are never deadly - they launch you
        if (obstacle.type === 'pad') {
            continue;
        }
        
        // For blocks, only die if hitting from side or bottom
        if (obstacle.type === 'block') {
            const playerBottom = player.y + player.height;
            const playerRight = player.x + player.width;
            const blockTop = obstacle.y;
            const blockBottom = obstacle.y + obstacle.height;
            const blockRight = obstacle.x + obstacle.width;
            
            // Check if player is standing on top of the block (not a deadly collision)
            const landingOnTop = 
                playerBottom <= blockTop + 15 && 
                player.velocityY >= 0;
            
            if (landingOnTop) {
                continue; // Not a deadly collision, player is on top
            }
            
            // Side collision (player hitting the left side of block)
            if (playerRight > obstacle.x && 
                player.x < obstacle.x &&
                playerBottom > blockTop + 10) {
                return true; // Deadly side collision
            }
            
            // Bottom collision (player hitting bottom of block from below)
            if (player.y < blockBottom && 
                playerBottom > blockBottom &&
                player.velocityY < 0) {
                return true; // Deadly bottom collision
            }
            
            // General collision that's not a landing
            if (!landingOnTop && playerBottom > blockTop + 15) {
                return true;
            }
        } else {
            // Spikes and saws are always deadly
            return true;
        }
    }
    return false;
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    
    // Glow effect
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 20;
    
    // Main square
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Inner highlight
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 5, player.width - 20, player.height - 20);
    
    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath();
    ctx.arc(8, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupil
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(10, -7, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawObstacles() {
    const level = getCurrentLevel();
    
    obstacles.forEach(obstacle => {
        ctx.save();
        
        if (obstacle.type === 'spike') {
            // Glow effect
            ctx.shadowColor = level.spikeColor;
            ctx.shadowBlur = 15;
            
            ctx.fillStyle = level.spikeColor;
            ctx.beginPath();
            
            if (obstacle.ceiling) {
                // Ceiling spike (pointing down)
                ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
                ctx.lineTo(obstacle.x, obstacle.y);
            } else {
                // Floor spike (pointing up)
                ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
            }
            ctx.closePath();
            ctx.fill();
            
            // Inner highlight
            ctx.fillStyle = level.spikeHighlight;
            ctx.beginPath();
            if (obstacle.ceiling) {
                ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height - 10);
                ctx.lineTo(obstacle.x + obstacle.width - 8, obstacle.y + 5);
                ctx.lineTo(obstacle.x + 8, obstacle.y + 5);
            } else {
                ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + 10);
                ctx.lineTo(obstacle.x + obstacle.width - 8, obstacle.y + obstacle.height - 5);
                ctx.lineTo(obstacle.x + 8, obstacle.y + obstacle.height - 5);
            }
            ctx.closePath();
            ctx.fill();
            
        } else if (obstacle.type === 'block') {
            // Glow effect
            ctx.shadowColor = level.blockHighlight;
            ctx.shadowBlur = 12;
            
            // Main block
            ctx.fillStyle = level.blockColor;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Top highlight
            ctx.fillStyle = level.blockHighlight;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 6);
            
            // Inner pattern
            const darkerBlock = adjustColor(level.blockColor, -20);
            ctx.fillStyle = darkerBlock;
            ctx.fillRect(obstacle.x + 5, obstacle.y + 10, obstacle.width - 10, obstacle.height - 15);
            
            // Edge highlight
            const lighterBlock = adjustColor(level.blockHighlight, 20);
            ctx.fillStyle = lighterBlock;
            ctx.fillRect(obstacle.x, obstacle.y, 3, obstacle.height);
            
        } else if (obstacle.type === 'saw') {
            // Rotate saw blade
            obstacle.rotation = (obstacle.rotation || 0) + 0.15;
            
            const centerX = obstacle.x + obstacle.width / 2;
            const centerY = obstacle.y + obstacle.height / 2;
            const radius = obstacle.width / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(obstacle.rotation);
            
            // Glow
            ctx.shadowColor = level.sawColor;
            ctx.shadowBlur = 20;
            
            // Draw saw blade with teeth
            ctx.fillStyle = level.sawColor;
            ctx.beginPath();
            const teeth = 8;
            for (let i = 0; i < teeth; i++) {
                const angle = (i / teeth) * Math.PI * 2;
                const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
                const outerRadius = radius;
                const innerRadius = radius * 0.6;
                
                ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
                ctx.lineTo(Math.cos(nextAngle) * innerRadius, Math.sin(nextAngle) * innerRadius);
            }
            ctx.closePath();
            ctx.fill();
            
            // Center circle
            const darkerSaw = adjustColor(level.sawColor, -40);
            ctx.fillStyle = darkerSaw;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner highlight
            const lighterSaw = adjustColor(level.sawColor, 30);
            ctx.fillStyle = lighterSaw;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (obstacle.type === 'pad') {
            // Launch pad
            const padColor = '#ffff00';
            const padHighlight = '#ffff88';
            
            // Glow effect
            ctx.shadowColor = padColor;
            ctx.shadowBlur = obstacle.activated ? 30 : 15;
            
            // Base of pad
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + 5, obstacle.y + 5);
            ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + 5);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
            
            // Top of pad (the bouncy part)
            ctx.fillStyle = padColor;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 5, obstacle.y + 5);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y - 3);
            ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + 5);
            ctx.closePath();
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = padHighlight;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 15, obstacle.y + 3);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width - 15, obstacle.y + 3);
            ctx.closePath();
            ctx.fill();
            
            // Arrow indicators
            ctx.fillStyle = '#ff6600';
            const arrowY = obstacle.y - 15;
            const arrowX = obstacle.x + obstacle.width / 2;
            
            // Animated arrows going up
            const time = Date.now() / 200;
            for (let i = 0; i < 2; i++) {
                const offset = ((time + i * 5) % 20);
                ctx.globalAlpha = 1 - offset / 20;
                ctx.beginPath();
                ctx.moveTo(arrowX, arrowY - offset);
                ctx.lineTo(arrowX - 8, arrowY + 8 - offset);
                ctx.lineTo(arrowX + 8, arrowY + 8 - offset);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            
            // Reset activated state after a moment
            if (obstacle.activated) {
                setTimeout(() => { obstacle.activated = false; }, 200);
            }
        }
        
        ctx.restore();
    });
}

// Helper function to adjust color brightness
function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
        );
        ctx.restore();
    });
}

function drawTrail() {
    // Draw motion trail behind player
    ctx.save();
    for (let i = 0; i < 5; i++) {
        const alpha = 0.15 - i * 0.03;
        const offset = (i + 1) * 12;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(
            player.x - offset,
            player.y + 10,
            player.width - 10,
            player.height - 20
        );
    }
    ctx.restore();
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update
    updatePlayer();
    updateObstacles();
    updatePortals();
    updateParticles();
    
    // Track distance
    distanceTraveled += gameSpeed;
    
    // Spawn checkpoint every 10 score
    if (score >= nextCheckpointScore && score > 0) {
        // Save checkpoint
        lastCheckpoint = {
            distance: distanceTraveled,
            score: score,
            speed: gameSpeed,
            level: currentLevel
        };
        checkpointScore = score;
        checkpointSpeed = gameSpeed;
        nextCheckpointScore = score + CHECKPOINT_SCORE_INTERVAL;
        
        // Show checkpoint notification
        showCheckpointNotification();
    }
    
    // Spawn portal when reaching score threshold
    if (score >= nextPortalScore && portals.length === 0) {
        spawnPortal();
        nextPortalScore = score + PORTAL_SCORE_INTERVAL + 100; // Prevent multiple spawns
    }
    
    // Increase speed gradually
    gameSpeed += GAME_SPEED_INCREMENT;
    
    // Check collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }
    
    // Draw
    drawTrail();
    drawPortals();
    drawParticles();
    drawObstacles();
    drawPlayer();
    drawCheckpointNotification();
    
    // Draw level transition flash
    if (levelTransitioning) {
        ctx.save();
        ctx.fillStyle = getCurrentLevel().groundLine;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    startScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
    gameLoop();
}

function restartGame() {
    gameOverScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
    gameLoop();
}

function resetGame() {
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    player.velocityY = 0;
    player.isOnGround = true;
    player.isJumping = false;
    player.jumpHoldTime = 0;
    player.rotation = 0;
    jumpKeyHeld = false;
    obstacles = [];
    particles = [];
    checkpoints = [];
    portals = [];
    lastCheckpoint = null;
    checkpointScore = 0;
    checkpointSpeed = GAME_SPEED_INITIAL;
    nextCheckpointScore = CHECKPOINT_SCORE_INTERVAL;
    checkpointNotification = null;
    distanceTraveled = 0;
    score = 0;
    gameSpeed = GAME_SPEED_INITIAL;
    scoreDisplay.textContent = '0';
    
    // Reset level
    currentLevel = 0;
    nextPortalScore = PORTAL_SCORE_INTERVAL;
    levelTransitioning = false;
    
    // Reset visuals to level 1
    try {
        updateLevelVisuals();
    } catch (e) {
        console.log('Level visuals will update on first transition');
    }
}

function gameOver() {
    gameRunning = false;
    createDeathParticles();
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('geometryJumpHighScore', highScore);
        highScoreDisplay.textContent = highScore;
    }
    
    // Check if we have a checkpoint to respawn at
    if (lastCheckpoint) {
        // Draw death animation then respawn
        const drawDeathFrame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            updateParticles();
            drawCheckpoints();
            drawParticles();
            drawObstacles();
            
            if (particles.length > 5) {
                requestAnimationFrame(drawDeathFrame);
            } else {
                respawnAtCheckpoint();
            }
        };
        drawDeathFrame();
    } else {
        finalScoreDisplay.textContent = score;
        
        // Draw final frame with particles
        const drawFinalFrame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            updateParticles();
            drawCheckpoints();
            drawParticles();
            drawObstacles();
            
            if (particles.length > 0) {
                requestAnimationFrame(drawFinalFrame);
            } else {
                gameOverScreen.classList.remove('hidden');
            }
        };
        drawFinalFrame();
    }
}

function respawnAtCheckpoint() {
    // Reset player position
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    player.velocityY = 0;
    player.isOnGround = true;
    player.isJumping = false;
    player.jumpHoldTime = 0;
    player.rotation = 0;
    jumpKeyHeld = false;
    
    // Restore score and speed from checkpoint
    score = checkpointScore;
    scoreDisplay.textContent = score;
    gameSpeed = checkpointSpeed;
    
    // Restore level if saved
    if (lastCheckpoint.level !== undefined) {
        currentLevel = lastCheckpoint.level;
        updateLevelVisuals();
    }
    
    // Clear current obstacles - start fresh after checkpoint
    obstacles = [];
    portals = [];
    
    // Set next checkpoint and portal scores
    nextCheckpointScore = score + CHECKPOINT_SCORE_INTERVAL;
    nextPortalScore = Math.ceil((score + 1) / PORTAL_SCORE_INTERVAL) * PORTAL_SCORE_INTERVAL;
    
    // Create respawn particles
    createRespawnParticles();
    
    // Resume game
    gameRunning = true;
    gameLoop();
}

function createRespawnParticles() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 8 + 4,
            color: '#00ff88',
            alpha: 1,
            decay: 0.03
        });
    }
}

// Checkpoint notification
let checkpointNotification = null;

function showCheckpointNotification() {
    checkpointNotification = {
        text: 'CHECKPOINT!',
        alpha: 1,
        y: canvas.height / 2 - 50
    };
    
    // Create checkpoint particles
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            size: Math.random() * 8 + 4,
            color: '#00ff88',
            alpha: 1,
            decay: 0.025
        });
    }
}

function drawCheckpointNotification() {
    if (!checkpointNotification) return;
    
    ctx.save();
    ctx.globalAlpha = checkpointNotification.alpha;
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 36px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(checkpointNotification.text, canvas.width / 2, checkpointNotification.y);
    ctx.restore();
    
    // Animate
    checkpointNotification.alpha -= 0.02;
    checkpointNotification.y -= 1;
    
    if (checkpointNotification.alpha <= 0) {
        checkpointNotification = null;
    }
}

// Initial draw
ctx.clearRect(0, 0, canvas.width, canvas.height);

