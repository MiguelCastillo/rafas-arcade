const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameRunning = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('spaceWavesHighScore') || 0;
let frameCount = 0;
let difficulty = 1;
let lastCheckpoint = 0;
const checkpointInterval = 20;

// Level system
let currentLevel = 1;
let portalActive = false;
let portalX = 0;
let portal = null;
let levelTransitioning = false;
let transitionAlpha = 0;

// Level configurations
const levelConfigs = {
    1: {
        name: "NEON VOID",
        wallColor: '#ff00ff',
        obstacleTypes: ['groundSpike', 'ceilingSpike', 'floatingSpike', 'hill', 'stalactite', 'crystal', 'saw'],
        bgColor: 'rgba(10, 0, 21, 0.4)',
        portalScore: 100
    },
    2: {
        name: "CYBER DEPTHS",
        wallColor: '#00ffff',
        obstacleTypes: ['laserGrid', 'movingWall', 'pulseOrb', 'zigzagSpike', 'floatingPlatform', 'vortex'],
        bgColor: 'rgba(0, 10, 21, 0.4)',
        portalScore: 200
    },
    3: {
        name: "QUANTUM STORM",
        wallColor: '#ffff00',
        obstacleTypes: ['all'],
        bgColor: 'rgba(21, 15, 0, 0.4)',
        portalScore: null // Final level
    }
};

// Update high score display
document.getElementById('high-score').textContent = `BEST: ${highScore}`;

// Triangle player
const player = {
    x: 150,
    y: canvas.height / 2,
    size: 20,
    velocity: 0,
    gravity: 0.3,
    lift: -3,
    maxVelocity: 18,
    rotation: 0,
    trail: []
};

// Tunnel boundaries - permanently tighter tunnel
const tunnelMargin = 150; // Larger margin = smaller tunnel
let tunnelTopY = tunnelMargin;
let tunnelBottomY = 0; // Set on init

// Obstacles array
let obstacles = [];
const baseSpeed = 12;
let gameSpeed = baseSpeed;

// Terrain - continuous ground and ceiling with variations
let terrain = {
    groundPoints: [],
    ceilingPoints: [],
    baseGround: 0,
    baseCeiling: 0
};

// Particles
let particles = [];

// Input handling
let isFlying = false;

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        isFlying = true;
        if (!gameRunning && !gameOver) {
            startGame();
        } else if (gameOver) {
            restartGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isFlying = false;
    }
});

canvas.addEventListener('mousedown', () => {
    isFlying = true;
    if (!gameRunning && !gameOver) {
        startGame();
    }
});

canvas.addEventListener('mouseup', () => {
    isFlying = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isFlying = true;
    if (!gameRunning && !gameOver) {
        startGame();
    }
});

canvas.addEventListener('touchend', () => {
    isFlying = false;
});

// Button handlers
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', restartGame);

function initTerrain() {
    terrain.baseGround = canvas.height - tunnelMargin;
    terrain.baseCeiling = tunnelMargin;
    terrain.groundPoints = [];
    terrain.ceilingPoints = [];
    
    // Initialize tunnel boundaries
    tunnelTopY = tunnelMargin;
    tunnelBottomY = canvas.height - tunnelMargin;
    
    // Initialize flat terrain extending past the screen
    for (let x = 0; x < canvas.width + 500; x += 20) {
        terrain.groundPoints.push({ x: x, y: terrain.baseGround });
        terrain.ceilingPoints.push({ x: x, y: terrain.baseCeiling });
    }
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameRunning = true;
    gameOver = false;
    score = 0;
    frameCount = 0;
    difficulty = 1;
    gameSpeed = baseSpeed;
    lastCheckpoint = 0;
    currentLevel = 1;
    portal = null;
    portalActive = false;
    levelTransitioning = false;
    transitionAlpha = 0;
    obstacles = [];
    particles = [];
    player.y = canvas.height / 2;
    player.velocity = 0;
    player.trail = [];
    initTerrain();
    document.getElementById('level-name').textContent = levelConfigs[1].name;
    updateScore();
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    gameRunning = true;
    gameOver = false;
    
    // Respawn at last checkpoint
    score = lastCheckpoint;
    frameCount = 0;
    difficulty = 1 + Math.floor(score / 5) * 0.3;
    gameSpeed = baseSpeed + (difficulty - 1) * 1.5;
    obstacles = [];
    particles = [];
    player.y = canvas.height / 2;
    player.velocity = 0;
    player.trail = [];
    initTerrain();
    updateScore();
}

function endGame() {
    gameRunning = false;
    gameOver = true;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceWavesHighScore', highScore);
        document.getElementById('high-score').textContent = `BEST: ${highScore}`;
    }
    
    document.getElementById('final-score-value').textContent = score;
    document.getElementById('checkpoint-value').textContent = lastCheckpoint;
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    // Explosion particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: player.x,
            y: player.y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 8 + 2,
            color: Math.random() > 0.5 ? '#ff00ff' : '#00ffff',
            life: 1
        });
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
    
    // Check if we reached a new checkpoint
    const currentCheckpoint = Math.floor(score / checkpointInterval) * checkpointInterval;
    if (currentCheckpoint > lastCheckpoint) {
        lastCheckpoint = currentCheckpoint;
        showCheckpointEffect();
    }
    
    // Check if portal should appear
    const config = levelConfigs[currentLevel];
    if (config.portalScore && score >= config.portalScore && !portalActive && !portal) {
        spawnPortal();
    }
}

function spawnPortal() {
    portalActive = true;
    portal = {
        x: canvas.width + 200,
        y: (tunnelTopY + tunnelBottomY) / 2,
        radius: 80,
        rotation: 0,
        entered: false
    };
}

function nextLevel() {
    levelTransitioning = true;
    transitionAlpha = 0;
}

function completeTransition() {
    currentLevel++;
    if (currentLevel > 3) currentLevel = 3;
    
    portal = null;
    portalActive = false;
    levelTransitioning = false;
    transitionAlpha = 0;
    obstacles = [];
    
    // Update checkpoint to current score
    lastCheckpoint = Math.floor(score / checkpointInterval) * checkpointInterval;
    
    // Update level name in UI
    document.getElementById('level-name').textContent = levelConfigs[currentLevel].name;
    
    // Show level announcement
    showLevelAnnouncement();
}

function showLevelAnnouncement() {
    // Big particle burst for new level
    for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: Math.cos(angle) * 15,
            vy: Math.sin(angle) * 15,
            size: Math.random() * 10 + 5,
            color: levelConfigs[currentLevel].wallColor,
            life: 2
        });
    }
}

function showCheckpointEffect() {
    // Spawn lots of particles for checkpoint celebration
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: player.x + Math.random() * 100 - 50,
            y: player.y + Math.random() * 100 - 50,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 8 + 4,
            color: '#00ff00',
            life: 1.5
        });
    }
}

// Obstacle types
const ObstacleType = {
    GROUND_SPIKE: 'groundSpike',
    CEILING_SPIKE: 'ceilingSpike',
    FLOATING_SPIKE: 'floatingSpike',
    HILL: 'hill',
    STALACTITE: 'stalactite',
    CRYSTAL: 'crystal',
    SAW: 'saw',
    LASER: 'laser',
    // Level 2 obstacles
    LASER_GRID: 'laserGrid',
    MOVING_WALL: 'movingWall',
    PULSE_ORB: 'pulseOrb',
    ZIGZAG_SPIKE: 'zigzagSpike',
    FLOATING_PLATFORM: 'floatingPlatform',
    VORTEX: 'vortex',
    // Portal
    PORTAL: 'portal'
};

function spawnFloorObstacle() {
    // Don't spawn obstacles during level transition
    if (levelTransitioning) return;
    
    const x = canvas.width + 100;
    const minGap = 200;
    const tunnelHeight = terrain.baseGround - terrain.baseCeiling;
    const maxHillHeight = tunnelHeight - minGap;
    
    // Randomly choose floor or ceiling
    const onCeiling = Math.random() > 0.5;
    // Randomly choose spike or hill
    const isSpike = Math.random() > 0.5;
    
    if (isSpike) {
        // Single or small cluster of spikes
        const spikeCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < spikeCount; i++) {
            obstacles.push({
                type: onCeiling ? ObstacleType.CEILING_SPIKE : ObstacleType.GROUND_SPIKE,
                x: x + i * 60,
                y: onCeiling ? terrain.baseCeiling : terrain.baseGround,
                width: 50,
                height: 90 + Math.random() * 50,
                passed: false
            });
        }
    } else {
        // Hill (from floor) or stalactite-like hill (from ceiling)
        const hillW = 150 + Math.random() * 80;
        const hillH = Math.min(80 + Math.random() * 50, maxHillHeight);
        
        obstacles.push({
            type: ObstacleType.HILL,
            x: x,
            y: onCeiling ? terrain.baseCeiling : terrain.baseGround,
            width: hillW,
            height: hillH,
            fromCeiling: onCeiling,
            passed: false
        });
    }
}

function spawnObstacle() {
    // Don't spawn obstacles during level transition
    if (levelTransitioning) return;
    
    let types;
    
    if (currentLevel === 1) {
        // Exclude spikes and hills - they spawn separately via spawnFloorObstacle
        types = [
            ObstacleType.FLOATING_SPIKE,
            ObstacleType.STALACTITE,
            ObstacleType.CRYSTAL,
            ObstacleType.SAW
        ];
        if (difficulty > 2) {
            types.push(ObstacleType.LASER);
        }
    } else if (currentLevel === 2) {
        types = [
            ObstacleType.LASER_GRID,
            ObstacleType.MOVING_WALL,
            ObstacleType.PULSE_ORB,
            ObstacleType.ZIGZAG_SPIKE,
            ObstacleType.FLOATING_PLATFORM,
            ObstacleType.VORTEX
        ];
    } else {
        // Level 3 - all obstacles except spikes/hills (they spawn separately)
        types = [
            ObstacleType.FLOATING_SPIKE,
            ObstacleType.SAW,
            ObstacleType.LASER_GRID,
            ObstacleType.MOVING_WALL,
            ObstacleType.PULSE_ORB,
            ObstacleType.ZIGZAG_SPIKE,
            ObstacleType.VORTEX
        ];
    }
    
    const type = types[Math.floor(Math.random() * types.length)];
    const x = canvas.width + 100;
    
    switch (type) {
        case ObstacleType.GROUND_SPIKE:
            // Cluster of spikes on ground
            const spikeCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < spikeCount; i++) {
                obstacles.push({
                    type: type,
                    x: x + i * 60,
                    y: terrain.baseGround,
                    width: 50,
                    height: 90 + Math.random() * 50,
                    passed: false
                });
            }
            break;
            
        case ObstacleType.CEILING_SPIKE:
            // Spikes hanging from ceiling
            const ceilSpikeCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < ceilSpikeCount; i++) {
                obstacles.push({
                    type: type,
                    x: x + i * 60,
                    y: terrain.baseCeiling,
                    width: 50,
                    height: 90 + Math.random() * 50,
                    passed: false
                });
            }
            break;
            
        case ObstacleType.FLOATING_SPIKE:
            // Floating spike in the middle area
            const floatY = terrain.baseCeiling + 100 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 200);
            obstacles.push({
                type: type,
                x: x,
                y: floatY,
                width: 70,
                height: 70,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: 0.05,
                passed: false
            });
            break;
            
        case ObstacleType.HILL:
            // Create hill patterns - multiple hills forming terrain to navigate
            const patternType = Math.floor(Math.random() * 5);
            
            // Minimum gap of 200 pixels must always be maintained
            const minGap = 200;
            const tunnelHeight = terrain.baseGround - terrain.baseCeiling;
            const maxHillHeight = tunnelHeight - minGap;
            
            if (patternType === 0) {
                // Wave pattern - alternating ground and ceiling hills
                const waveCount = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < waveCount; i++) {
                    const hillW = 200 + Math.random() * 100;
                    // Ensure hill doesn't exceed max height (leaves 200px gap)
                    const hillH = Math.min(100 + Math.random() * 60, maxHillHeight);
                    const isGround = i % 2 === 0;
                    obstacles.push({
                        type: type,
                        x: x + i * (hillW * 0.7),
                        y: isGround ? terrain.baseGround : terrain.baseCeiling,
                        width: hillW,
                        height: hillH,
                        fromCeiling: !isGround,
                        passed: false
                    });
                    // Add spike on top of some hills (only if there's room)
                    if (Math.random() > 0.5 && hillH + 70 < maxHillHeight) {
                        const spikeX = x + i * (hillW * 0.7) + hillW / 2 - 25;
                        const spikeY = isGround ? terrain.baseGround - hillH : terrain.baseCeiling + hillH;
                        obstacles.push({
                            type: isGround ? ObstacleType.GROUND_SPIKE : ObstacleType.CEILING_SPIKE,
                            x: spikeX,
                            y: isGround ? spikeY : terrain.baseCeiling + hillH,
                            width: 50,
                            height: 70,
                            onHill: true,
                            hillY: spikeY,
                            passed: false
                        });
                    }
                }
            } else if (patternType === 1) {
                // Corridor - ground and ceiling hills creating a passage with guaranteed 200px gap
                const corridorLength = 3 + Math.floor(Math.random() * 2);
                const gapHeight = minGap; // Exactly 200px gap
                const gapCenter = terrain.baseCeiling + tunnelHeight / 2 + (Math.random() - 0.5) * 80;
                
                for (let i = 0; i < corridorLength; i++) {
                    const hillW = 180 + Math.random() * 80;
                    const groundHillHeight = terrain.baseGround - (gapCenter + gapHeight / 2);
                    const ceilingHillHeight = (gapCenter - gapHeight / 2) - terrain.baseCeiling;
                    
                    // Ground hill
                    if (groundHillHeight > 50) {
                        obstacles.push({
                            type: type,
                            x: x + i * (hillW * 0.8),
                            y: terrain.baseGround,
                            width: hillW,
                            height: groundHillHeight,
                            fromCeiling: false,
                            passed: false
                        });
                    }
                    // Ceiling hill
                    if (ceilingHillHeight > 50) {
                        obstacles.push({
                            type: type,
                            x: x + i * (hillW * 0.8),
                            y: terrain.baseCeiling,
                            width: hillW,
                            height: ceilingHillHeight,
                            fromCeiling: true,
                            passed: false
                        });
                    }
                }
            } else if (patternType === 2) {
                // Staircase - ascending or descending hills (200px gap from ceiling)
                const stairCount = 4 + Math.floor(Math.random() * 3);
                const ascending = Math.random() > 0.5;
                for (let i = 0; i < stairCount; i++) {
                    const hillW = 150 + Math.random() * 70;
                    const baseHeight = 60;
                    const stepHeight = ascending ? baseHeight + i * 35 : baseHeight + (stairCount - i - 1) * 35;
                    const clampedHeight = Math.min(stepHeight, maxHillHeight);
                    obstacles.push({
                        type: type,
                        x: x + i * (hillW * 0.9),
                        y: terrain.baseGround,
                        width: hillW,
                        height: clampedHeight,
                        fromCeiling: false,
                        passed: false
                    });
                    // Add spikes on some steps (only if there's room)
                    if (Math.random() > 0.6 && clampedHeight + 70 < maxHillHeight) {
                        obstacles.push({
                            type: ObstacleType.GROUND_SPIKE,
                            x: x + i * (hillW * 0.9) + hillW / 2 - 25,
                            y: terrain.baseGround - clampedHeight,
                            width: 50,
                            height: 70,
                            onHill: true,
                            passed: false
                        });
                    }
                }
            } else if (patternType === 3) {
                // Valley - two tall hills with a dip in between (200px gap from ceiling)
                const valleyWidth = 350 + Math.random() * 150;
                const peakHeight = Math.min(120 + Math.random() * 60, maxHillHeight);
                // Left peak
                obstacles.push({
                    type: type,
                    x: x,
                    y: terrain.baseGround,
                    width: 200,
                    height: peakHeight,
                    fromCeiling: false,
                    passed: false
                });
                // Right peak
                obstacles.push({
                    type: type,
                    x: x + valleyWidth,
                    y: terrain.baseGround,
                    width: 200,
                    height: peakHeight,
                    fromCeiling: false,
                    passed: false
                });
                // Floating obstacle in the valley
                if (Math.random() > 0.4) {
                    obstacles.push({
                        type: ObstacleType.CRYSTAL,
                        x: x + valleyWidth / 2 + 100,
                        y: terrain.baseGround - peakHeight / 2,
                        size: 70 + Math.random() * 30,
                        bobOffset: Math.random() * Math.PI * 2,
                        passed: false
                    });
                }
                // Spikes on peaks (only if room)
                if (Math.random() > 0.5 && peakHeight + 80 < maxHillHeight) {
                    obstacles.push({
                        type: ObstacleType.GROUND_SPIKE,
                        x: x + 75,
                        y: terrain.baseGround - peakHeight,
                        width: 50,
                        height: 80,
                        onHill: true,
                        passed: false
                    });
                }
            } else {
                // Mountain range - series of varying height hills (200px gap from ceiling)
                const mountainCount = 5 + Math.floor(Math.random() * 3);
                for (let i = 0; i < mountainCount; i++) {
                    const hillW = 140 + Math.random() * 80;
                    // Create a wave-like height pattern
                    const heightMod = Math.sin(i * 0.8) * 50;
                    const hillH = Math.min(Math.max(50, 80 + heightMod + Math.random() * 40), maxHillHeight);
                    obstacles.push({
                        type: type,
                        x: x + i * (hillW * 0.6),
                        y: terrain.baseGround,
                        width: hillW,
                        height: hillH,
                        fromCeiling: false,
                        passed: false
                    });
                    // Occasional spikes on peaks (only if room)
                    if (Math.random() > 0.7 && hillH > 200 && hillH + 60 < maxHillHeight) {
                        obstacles.push({
                            type: ObstacleType.GROUND_SPIKE,
                            x: x + i * (hillW * 0.6) + hillW / 2 - 20,
                            y: terrain.baseGround - hillH,
                            width: 40,
                            height: 60,
                            onHill: true,
                            passed: false
                        });
                    }
                }
            }
            break;
            
        case ObstacleType.STALACTITE:
            // Ceiling formation to fly under
            const stalWidth = 180 + Math.random() * 100;
            const stalHeight = 100 + Math.random() * 60;
            obstacles.push({
                type: type,
                x: x,
                y: terrain.baseCeiling,
                width: stalWidth,
                height: stalHeight,
                passed: false
            });
            break;
            
        case ObstacleType.CRYSTAL:
            // Diamond-shaped obstacle floating
            const crystalY = terrain.baseCeiling + 120 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 240);
            obstacles.push({
                type: type,
                x: x,
                y: crystalY,
                size: 60 + Math.random() * 40,
                bobOffset: Math.random() * Math.PI * 2,
                passed: false
            });
            break;
            
        case ObstacleType.SAW:
            // Spinning saw blade
            const sawY = terrain.baseCeiling + 100 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 200);
            obstacles.push({
                type: type,
                x: x,
                y: sawY,
                radius: 55 + Math.random() * 30,
                rotation: 0,
                passed: false
            });
            break;
            
        case ObstacleType.LASER:
            // Horizontal laser beam
            const laserY = terrain.baseCeiling + 80 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 160);
            obstacles.push({
                type: type,
                x: x,
                y: laserY,
                width: 300,
                height: 14,
                pulsePhase: 0,
                passed: false
            });
            break;
            
        // LEVEL 2 OBSTACLES
        case ObstacleType.LASER_GRID:
            // Multiple crossing lasers
            const gridCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < gridCount; i++) {
                const gridY = terrain.baseCeiling + 60 + (i * (terrain.baseGround - terrain.baseCeiling - 120) / gridCount);
                obstacles.push({
                    type: type,
                    x: x + i * 40,
                    y: gridY,
                    width: 250,
                    height: 10,
                    pulsePhase: i * Math.PI / 2,
                    passed: false
                });
            }
            break;
            
        case ObstacleType.MOVING_WALL:
            // Wall that moves up and down
            const wallStartY = (terrain.baseCeiling + terrain.baseGround) / 2;
            obstacles.push({
                type: type,
                x: x,
                y: wallStartY,
                width: 60,
                height: 150,
                startY: wallStartY,
                moveRange: 100,
                moveSpeed: 0.03,
                movePhase: Math.random() * Math.PI * 2,
                passed: false
            });
            break;
            
        case ObstacleType.PULSE_ORB:
            // Orb that pulses and grows/shrinks
            const orbY = terrain.baseCeiling + 100 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 200);
            obstacles.push({
                type: type,
                x: x,
                y: orbY,
                baseRadius: 40,
                radius: 40,
                pulsePhase: Math.random() * Math.PI * 2,
                passed: false
            });
            break;
            
        case ObstacleType.ZIGZAG_SPIKE:
            // Spikes that form a zigzag pattern
            const zigCount = 4;
            for (let i = 0; i < zigCount; i++) {
                const fromTop = i % 2 === 0;
                obstacles.push({
                    type: fromTop ? ObstacleType.CEILING_SPIKE : ObstacleType.GROUND_SPIKE,
                    x: x + i * 80,
                    y: fromTop ? terrain.baseCeiling : terrain.baseGround,
                    width: 50,
                    height: 120 + Math.random() * 40,
                    passed: false
                });
            }
            break;
            
        case ObstacleType.FLOATING_PLATFORM:
            // Platform you must go around
            const platY = terrain.baseCeiling + 80 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 160);
            obstacles.push({
                type: type,
                x: x,
                y: platY,
                width: 200,
                height: 30,
                passed: false
            });
            break;
            
        case ObstacleType.VORTEX:
            // Spinning vortex that pulls you in
            const vortexY = terrain.baseCeiling + 120 + Math.random() * (terrain.baseGround - terrain.baseCeiling - 240);
            obstacles.push({
                type: type,
                x: x,
                y: vortexY,
                radius: 60,
                rotation: 0,
                pullStrength: 0.3,
                passed: false
            });
            break;
    }
}

function update() {
    if (!gameRunning) return;
    
    frameCount++;
    
    // Increase difficulty over time (faster scaling)
    difficulty = 1 + Math.floor(score / 5) * 0.3;
    gameSpeed = baseSpeed + (difficulty - 1) * 1.5;
    
    // Player physics - abrupt transitions between floating and falling
    if (isFlying) {
        player.velocity = -14; // Instant upward velocity (lift)
    } else {
        player.velocity = 10; // Instant downward velocity (gravity)
    }
    
    player.velocity = Math.max(-player.maxVelocity, Math.min(player.maxVelocity, player.velocity));
    player.y += player.velocity;
    
    // Rotation based on velocity
    player.rotation = player.velocity * 0.04;
    
    // Trail effect - always behind the triangle horizontally (much longer)
    player.trail = [];
    for (let i = 0; i < 40; i++) {
        player.trail.push({
            x: player.x - (i * 12), // Extend far behind the triangle
            y: player.y, // Same Y as triangle
            alpha: 1 - (i / 40)
        });
    }
    
    // Spawn obstacles
    // Spawn floor and ceiling obstacles (spikes and hills)
    const floorSpawnRate = Math.max(60, 75 - difficulty * 3);
    if (frameCount % Math.floor(floorSpawnRate) === 0) {
        // Check clearance for floor and ceiling obstacles
        const floorObstacles = obstacles.filter(obs => 
            obs.type === ObstacleType.GROUND_SPIKE || 
            obs.type === ObstacleType.CEILING_SPIKE ||
            obs.type === ObstacleType.HILL
        );
        const rightmostFloorX = floorObstacles.reduce((max, obs) => {
            const obsRight = obs.x + (obs.width || 50);
            return Math.max(max, obsRight);
        }, 0);
        
        if (rightmostFloorX < canvas.width - 100) {
            spawnFloorObstacle();
        }
    }
    
    // Spawn other obstacles at normal rate
    const spawnRate = Math.max(15, 22 - difficulty * 2);
    if (frameCount % Math.floor(spawnRate) === 0) {
        // Only spawn if there's enough clearance from existing obstacles
        const minClearance = 150; // Minimum gap between obstacles
        const rightmostX = obstacles.reduce((max, obs) => {
            const obsRight = obs.x + (obs.width || obs.radius * 2 || obs.size * 2 || 50);
            return Math.max(max, obsRight);
        }, 0);
        
        if (rightmostX < canvas.width - minClearance) {
            spawnObstacle();
        }
    }
    
    // Update obstacles
    obstacles.forEach(obs => {
        obs.x -= gameSpeed;
        
        // Update specific obstacle behaviors
        if (obs.type === ObstacleType.FLOATING_SPIKE) {
            obs.rotation += obs.rotationSpeed;
        }
        if (obs.type === ObstacleType.CRYSTAL) {
            obs.bobOffset += 0.05;
        }
        if (obs.type === ObstacleType.SAW) {
            obs.rotation += 0.15;
        }
        if (obs.type === ObstacleType.LASER) {
            obs.pulsePhase += 0.1;
        }
        // Level 2 obstacle updates
        if (obs.type === ObstacleType.LASER_GRID) {
            obs.pulsePhase += 0.08;
        }
        if (obs.type === ObstacleType.MOVING_WALL) {
            obs.movePhase += obs.moveSpeed;
        }
        if (obs.type === ObstacleType.PULSE_ORB) {
            obs.pulsePhase += 0.08;
        }
        if (obs.type === ObstacleType.VORTEX) {
            obs.rotation += 0.1;
            // Apply pull effect to player if nearby
            const distToVortex = Math.hypot(player.x - obs.x, player.y - obs.y);
            if (distToVortex < 200 && distToVortex > 0) {
                const pullX = (obs.x - player.x) / distToVortex * obs.pullStrength;
                const pullY = (obs.y - player.y) / distToVortex * obs.pullStrength;
                player.y += pullY;
            }
        }
        
        // Score when passing obstacle
        if (!obs.passed && obs.x + (obs.width || obs.radius * 2 || obs.size * 2) < player.x - player.size) {
            obs.passed = true;
            score++;
            updateScore();
            
            // Score particles
            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.random() * 3 + 1,
                    vy: (Math.random() - 0.5) * 3,
                    size: Math.random() * 3 + 2,
                    color: '#00ffff',
                    life: 0.6
                });
            }
        }
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obs => obs.x > -300);
    
    // Tunnel wall collision - bounce/stop at boundaries instead of dying
    if (player.y - player.size < tunnelTopY) {
        player.y = tunnelTopY + player.size;
        player.velocity = Math.abs(player.velocity) * 0.3; // Soft bounce down
    }
    if (player.y + player.size > tunnelBottomY) {
        player.y = tunnelBottomY - player.size;
        player.velocity = -Math.abs(player.velocity) * 0.3; // Soft bounce up
    }
    
    // Obstacle collisions
    for (let obs of obstacles) {
        if (checkCollision(player, obs)) {
            endGame();
            return;
        }
    }
    
    // Update particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vx *= 0.98;
        p.vy *= 0.98;
    });
    particles = particles.filter(p => p.life > 0);
    
    // Update portal
    if (portal && !portal.entered) {
        portal.x -= gameSpeed;
        portal.rotation += 0.05;
        
        // Check portal collision
        const distToPortal = Math.hypot(player.x - portal.x, player.y - portal.y);
        if (distToPortal < portal.radius + player.size) {
            portal.entered = true;
            nextLevel();
        }
    }
    
    // Handle level transition
    if (levelTransitioning) {
        transitionAlpha += 0.03;
        if (transitionAlpha >= 1) {
            completeTransition();
        }
    }
}

function checkCollision(player, obs) {
    const px = player.x;
    const py = player.y;
    const pr = player.size * 0.6; // Collision radius
    
    switch (obs.type) {
        case ObstacleType.GROUND_SPIKE:
            // Triangle pointing up from ground (or from hill surface)
            const groundSpikeBase = obs.onHill ? obs.y : obs.y;
            return pointInTriangle(px, py, pr,
                obs.x + obs.width / 2, groundSpikeBase - obs.height,
                obs.x, groundSpikeBase,
                obs.x + obs.width, groundSpikeBase
            );
            
        case ObstacleType.CEILING_SPIKE:
            // Triangle pointing down from ceiling (or from ceiling hill surface)
            const ceilSpikeBase = obs.onHill ? obs.y : obs.y;
            return pointInTriangle(px, py, pr,
                obs.x + obs.width / 2, ceilSpikeBase + obs.height,
                obs.x, ceilSpikeBase,
                obs.x + obs.width, ceilSpikeBase
            );
            
        case ObstacleType.FLOATING_SPIKE:
            // Rotating diamond
            const dist = Math.hypot(px - obs.x, py - obs.y);
            return dist < pr + obs.width * 0.4;
            
        case ObstacleType.HILL:
            // Curved hill - check collision with parabolic shape
            if (px + pr > obs.x && px - pr < obs.x + obs.width) {
                const relX = Math.max(0, Math.min(1, (px - obs.x) / obs.width));
                if (obs.fromCeiling) {
                    // Hill coming from ceiling
                    const hillY = obs.y + obs.height * Math.sin(relX * Math.PI);
                    if (py - pr < hillY) {
                        return true;
                    }
                } else {
                    // Hill coming from ground
                    const hillY = obs.y - obs.height * Math.sin(relX * Math.PI);
                    if (py + pr > hillY) {
                        return true;
                    }
                }
            }
            return false;
            
        case ObstacleType.STALACTITE:
            // Inverted hill from ceiling
            if (px + pr > obs.x && px - pr < obs.x + obs.width) {
                const relX = (px - obs.x) / obs.width;
                const stalY = obs.y + obs.height * Math.sin(relX * Math.PI);
                if (py - pr < stalY) {
                    return true;
                }
            }
            return false;
            
        case ObstacleType.CRYSTAL:
            // Diamond shape with bobbing
            const bobY = obs.y + Math.sin(obs.bobOffset) * 15;
            const crystalDist = Math.hypot(px - obs.x, py - bobY);
            return crystalDist < pr + obs.size * 0.5;
            
        case ObstacleType.SAW:
            // Circle collision
            const sawDist = Math.hypot(px - obs.x, py - obs.y);
            return sawDist < pr + obs.radius;
            
        case ObstacleType.LASER:
            // Rectangle collision with pulsing consideration
            const laserActive = Math.sin(obs.pulsePhase) > -0.3;
            if (!laserActive) return false;
            return px + pr > obs.x && px - pr < obs.x + obs.width &&
                   py + pr > obs.y - obs.height && py - pr < obs.y + obs.height;
                   
        case ObstacleType.LASER_GRID:
            const gridActive = Math.sin(obs.pulsePhase) > -0.3;
            if (!gridActive) return false;
            return px + pr > obs.x && px - pr < obs.x + obs.width &&
                   py + pr > obs.y - obs.height && py - pr < obs.y + obs.height;
                   
        case ObstacleType.MOVING_WALL:
            const wallY = obs.startY + Math.sin(obs.movePhase) * obs.moveRange;
            return px + pr > obs.x && px - pr < obs.x + obs.width &&
                   py + pr > wallY - obs.height / 2 && py - pr < wallY + obs.height / 2;
                   
        case ObstacleType.PULSE_ORB:
            const orbDist = Math.hypot(px - obs.x, py - obs.y);
            return orbDist < pr + obs.radius;
            
        case ObstacleType.FLOATING_PLATFORM:
            return px + pr > obs.x && px - pr < obs.x + obs.width &&
                   py + pr > obs.y - obs.height / 2 && py - pr < obs.y + obs.height / 2;
                   
        case ObstacleType.VORTEX:
            const vortexDist = Math.hypot(px - obs.x, py - obs.y);
            return vortexDist < pr + obs.radius * 0.4; // Core collision only
    }
    return false;
}

function pointInTriangle(px, py, pr, x1, y1, x2, y2, x3, y3) {
    // Check if circle intersects with triangle (simplified)
    const centerX = (x1 + x2 + x3) / 3;
    const centerY = (y1 + y2 + y3) / 3;
    const dist = Math.hypot(px - centerX, py - centerY);
    const triRadius = Math.max(
        Math.hypot(x1 - centerX, y1 - centerY),
        Math.hypot(x2 - centerX, y2 - centerY),
        Math.hypot(x3 - centerX, y3 - centerY)
    );
    return dist < pr + triRadius * 0.7;
}

function draw() {
    // Clear canvas with level-specific background
    const config = levelConfigs[currentLevel];
    ctx.fillStyle = config ? config.bgColor : 'rgba(10, 0, 21, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    drawGrid();
    
    // Draw tunnel
    drawTunnel();
    
    // Draw obstacles
    obstacles.forEach(drawObstacle);
    
    // Draw portal
    drawPortal();
    
    // Draw particles
    particles.forEach(drawParticle);
    
    // Level transition overlay
    if (levelTransitioning) {
        ctx.fillStyle = `rgba(255, 255, 255, ${transitionAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (transitionAlpha > 0.5) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 48px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(levelConfigs[currentLevel + 1]?.name || 'QUANTUM STORM', canvas.width / 2, canvas.height / 2);
        }
    }
    
    // Draw player trail - bright yellow glow
    player.trail.forEach((point, i) => {
        ctx.save();
        ctx.globalAlpha = point.alpha * 0.8;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        const size = player.size * (1 - i / player.trail.length) * 0.6;
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.globalAlpha = point.alpha * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    
    // Draw player
    if (gameRunning || (!gameRunning && !gameOver)) {
        drawPlayer();
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.08)';
    ctx.lineWidth = 1;
    
    const gridSize = 60;
    const offset = (frameCount * gameSpeed * 0.5) % gridSize;
    
    // Vertical lines (moving)
    for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, tunnelTopY);
        ctx.lineTo(x, tunnelBottomY);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = tunnelTopY; y < tunnelBottomY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawTunnel() {
    const config = levelConfigs[currentLevel];
    const wallColor = config ? config.wallColor : '#ff00ff';
    
    // Parse wall color for dim version
    let wallColorDim;
    if (wallColor === '#ff00ff') {
        wallColorDim = 'rgba(255, 0, 255, 0.1)';
    } else if (wallColor === '#00ffff') {
        wallColorDim = 'rgba(0, 255, 255, 0.1)';
    } else if (wallColor === '#ffff00') {
        wallColorDim = 'rgba(255, 255, 0, 0.1)';
    } else {
        wallColorDim = 'rgba(255, 0, 255, 0.1)';
    }
    
    // Top wall gradient
    const gradient1 = ctx.createLinearGradient(0, 0, 0, tunnelTopY);
    gradient1.addColorStop(0, wallColor);
    gradient1.addColorStop(1, wallColorDim);
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, canvas.width, tunnelTopY);
    
    // Top wall glow line
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = wallColor;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(0, tunnelTopY);
    ctx.lineTo(canvas.width, tunnelTopY);
    ctx.stroke();
    
    // Bottom wall gradient
    const gradient2 = ctx.createLinearGradient(0, tunnelBottomY, 0, canvas.height);
    gradient2.addColorStop(0, wallColorDim);
    gradient2.addColorStop(1, wallColor);
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, tunnelBottomY, canvas.width, canvas.height - tunnelBottomY);
    
    // Bottom wall glow line
    ctx.beginPath();
    ctx.moveTo(0, tunnelBottomY);
    ctx.lineTo(canvas.width, tunnelBottomY);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawObstacle(obs) {
    ctx.save();
    
    switch (obs.type) {
        case ObstacleType.GROUND_SPIKE:
            drawSpike(obs.x, obs.y, obs.width, obs.height, true, obs.onHill);
            break;
            
        case ObstacleType.CEILING_SPIKE:
            drawSpike(obs.x, obs.y, obs.width, obs.height, false, obs.onHill);
            break;
            
        case ObstacleType.FLOATING_SPIKE:
            ctx.translate(obs.x, obs.y);
            ctx.rotate(obs.rotation);
            drawDiamond(0, 0, obs.width);
            break;
            
        case ObstacleType.HILL:
            drawHill(obs);
            break;
            
        case ObstacleType.STALACTITE:
            drawStalactite(obs);
            break;
            
        case ObstacleType.CRYSTAL:
            const bobY = obs.y + Math.sin(obs.bobOffset) * 15;
            drawCrystal(obs.x, bobY, obs.size);
            break;
            
        case ObstacleType.SAW:
            drawSaw(obs);
            break;
            
        case ObstacleType.LASER:
            drawLaser(obs);
            break;
            
        case ObstacleType.LASER_GRID:
            drawLaserGrid(obs);
            break;
            
        case ObstacleType.MOVING_WALL:
            drawMovingWall(obs);
            break;
            
        case ObstacleType.PULSE_ORB:
            drawPulseOrb(obs);
            break;
            
        case ObstacleType.FLOATING_PLATFORM:
            drawFloatingPlatform(obs);
            break;
            
        case ObstacleType.VORTEX:
            drawVortex(obs);
            break;
    }
    
    ctx.restore();
}

function drawSpike(x, y, width, height, pointUp, onHill = false) {
    ctx.shadowBlur = 0;
    
    const baseColor = onHill ? '#ff6600' : '#00ffff';
    const baseColorRgba = onHill ? 'rgba(255, 102, 0, 0.8)' : 'rgba(0, 255, 255, 0.8)';
    
    const gradient = ctx.createLinearGradient(x, y, x, pointUp ? y - height : y + height);
    gradient.addColorStop(0, baseColorRgba);
    gradient.addColorStop(1, baseColor);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (pointUp) {
        ctx.moveTo(x + width / 2, y - height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + width, y);
    } else {
        ctx.moveTo(x + width / 2, y + height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + width, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    if (pointUp) {
        ctx.moveTo(x + width / 2, y - height + 10);
        ctx.lineTo(x + width * 0.3, y - 5);
        ctx.lineTo(x + width * 0.5, y - 5);
    } else {
        ctx.moveTo(x + width / 2, y + height - 10);
        ctx.lineTo(x + width * 0.3, y + 5);
        ctx.lineTo(x + width * 0.5, y + 5);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawDiamond(x, y, size) {
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, '#ffaa00');
    gradient.addColorStop(1, '#ff6600');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.lineTo(x - size / 2, y);
    ctx.closePath();
    ctx.fill();
    
    // Inner glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x, y - size / 4);
    ctx.lineTo(x + size / 4, y);
    ctx.lineTo(x, y + size / 4);
    ctx.lineTo(x - size / 4, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawHill(obs) {
    ctx.shadowBlur = 0;
    
    const fromCeiling = obs.fromCeiling || false;
    
    const gradient = fromCeiling 
        ? ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height)
        : ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y - obs.height);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
    gradient.addColorStop(1, '#00ff88');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    
    // Draw curved hill
    for (let i = 0; i <= obs.width; i += 5) {
        const relX = i / obs.width;
        const hillY = fromCeiling 
            ? obs.y + obs.height * Math.sin(relX * Math.PI)
            : obs.y - obs.height * Math.sin(relX * Math.PI);
        ctx.lineTo(obs.x + i, hillY);
    }
    
    ctx.lineTo(obs.x + obs.width, obs.y);
    ctx.closePath();
    ctx.fill();
    
    // Highlight line
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= obs.width; i += 5) {
        const relX = i / obs.width;
        const hillY = fromCeiling 
            ? obs.y + obs.height * Math.sin(relX * Math.PI)
            : obs.y - obs.height * Math.sin(relX * Math.PI);
        if (i === 0) ctx.moveTo(obs.x + i, hillY);
        else ctx.lineTo(obs.x + i, hillY);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawStalactite(obs) {
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
    gradient.addColorStop(0, 'rgba(136, 0, 255, 0.6)');
    gradient.addColorStop(1, '#8800ff');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    
    // Draw curved stalactite
    for (let i = 0; i <= obs.width; i += 5) {
        const relX = i / obs.width;
        const stalY = obs.y + obs.height * Math.sin(relX * Math.PI);
        ctx.lineTo(obs.x + i, stalY);
    }
    
    ctx.lineTo(obs.x + obs.width, obs.y);
    ctx.closePath();
    ctx.fill();
    
    // Highlight line
    ctx.strokeStyle = '#aa44ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= obs.width; i += 5) {
        const relX = i / obs.width;
        const stalY = obs.y + obs.height * Math.sin(relX * Math.PI);
        if (i === 0) ctx.moveTo(obs.x + i, stalY);
        else ctx.lineTo(obs.x + i, stalY);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawCrystal(x, y, size) {
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, '#ff88cc');
    gradient.addColorStop(0.5, '#ff00aa');
    gradient.addColorStop(1, '#aa0066');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.fill();
    
    // Inner shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.1, y - size * 0.5);
    ctx.lineTo(x + size * 0.2, y - size * 0.2);
    ctx.lineTo(x, y);
    ctx.lineTo(x - size * 0.3, y - size * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawSaw(obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.rotation);
    
    ctx.shadowBlur = 0;
    
    // Outer teeth
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    const teeth = 12;
    for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;
        const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
        const outerR = obs.radius;
        const innerR = obs.radius * 0.7;
        
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.lineTo(Math.cos(nextAngle) * innerR, Math.sin(nextAngle) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    
    // Center circle
    ctx.fillStyle = '#aa0000';
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Center hole
    ctx.fillStyle = '#330000';
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawLaser(obs) {
    const intensity = (Math.sin(obs.pulsePhase) + 1) / 2;
    const active = Math.sin(obs.pulsePhase) > -0.3;
    
    if (!active) {
        // Draw dim warning line
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
    }
    
    ctx.shadowBlur = 0;
    
    // Main beam
    const gradient = ctx.createLinearGradient(obs.x, obs.y - obs.height, obs.x, obs.y + obs.height);
    gradient.addColorStop(0, `rgba(255, 100, 100, ${intensity * 0.3})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 0, ${intensity})`);
    gradient.addColorStop(1, `rgba(255, 100, 100, ${intensity * 0.3})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, obs.y - obs.height, obs.width, obs.height * 2);
    
    // Core beam
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
    ctx.fillRect(obs.x, obs.y - 2, obs.width, 4);
    
    // Emitter circles at ends
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(obs.x + obs.width, obs.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawLaserGrid(obs) {
    const intensity = (Math.sin(obs.pulsePhase) + 1) / 2;
    const active = Math.sin(obs.pulsePhase) > -0.3;
    
    if (!active) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
    }
    
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createLinearGradient(obs.x, obs.y - obs.height, obs.x, obs.y + obs.height);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${intensity * 0.3})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 255, ${intensity})`);
    gradient.addColorStop(1, `rgba(0, 255, 255, ${intensity * 0.3})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, obs.y - obs.height, obs.width, obs.height * 2);
    
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
    ctx.fillRect(obs.x, obs.y - 2, obs.width, 4);
    
    ctx.shadowBlur = 0;
}

function drawMovingWall(obs) {
    const wallY = obs.startY + Math.sin(obs.movePhase) * obs.moveRange;
    
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createLinearGradient(obs.x, wallY - obs.height / 2, obs.x + obs.width, wallY + obs.height / 2);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, '#ff6600');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, wallY - obs.height / 2, obs.width, obs.height);
    
    // Warning arrows
    ctx.fillStyle = '#000';
    const arrowY = wallY;
    ctx.beginPath();
    ctx.moveTo(obs.x + 15, arrowY - 10);
    ctx.lineTo(obs.x + 25, arrowY);
    ctx.lineTo(obs.x + 15, arrowY + 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.width - 15, arrowY - 10);
    ctx.lineTo(obs.x + obs.width - 25, arrowY);
    ctx.lineTo(obs.x + obs.width - 15, arrowY + 10);
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawPulseOrb(obs) {
    const pulse = (Math.sin(obs.pulsePhase) + 1) / 2;
    const currentRadius = obs.baseRadius + pulse * 20;
    obs.radius = currentRadius;
    
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, currentRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ff88ff');
    gradient.addColorStop(0.7, '#ff00ff');
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, currentRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawFloatingPlatform(obs) {
    ctx.shadowBlur = 0;
    
    const gradient = ctx.createLinearGradient(obs.x, obs.y - obs.height / 2, obs.x, obs.y + obs.height / 2);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#00aa00');
    gradient.addColorStop(1, '#006600');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, obs.y - obs.height / 2, obs.width, obs.height);
    
    // Edge glow
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x, obs.y - obs.height / 2, obs.width, obs.height);
    
    // Pattern lines
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < obs.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(obs.x + i, obs.y - obs.height / 2);
        ctx.lineTo(obs.x + i, obs.y + obs.height / 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
}

function drawVortex(obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.rotation);
    
    ctx.shadowBlur = 0;
    
    // Outer swirl
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        
        const gradient = ctx.createLinearGradient(0, 0, obs.radius, 0);
        gradient.addColorStop(0, 'rgba(136, 0, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(136, 0, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(136, 0, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(obs.radius * 0.5, 0, obs.radius * 0.6, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Center core
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, obs.radius * 0.4);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.5, '#aa44ff');
    coreGradient.addColorStop(1, '#8800ff');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawPortal() {
    if (!portal) return;
    
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(portal.rotation);
    
    ctx.shadowBlur = 0;
    
    // Outer ring
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner swirl
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + portal.rotation * 2;
        ctx.save();
        ctx.rotate(angle);
        
        const gradient = ctx.createLinearGradient(0, 0, portal.radius * 0.8, 0);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(portal.radius * 0.4, 0, portal.radius * 0.4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Center glow
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portal.radius * 0.5);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    centerGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)');
    centerGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // "NEXT LEVEL" text
    ctx.rotate(-portal.rotation); // Counter-rotate for readable text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + (currentLevel + 1), 0, 5);
    
    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);
    
    // Glow effect
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 25;
    
    // Triangle
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(player.size, 0);
    ctx.lineTo(-player.size * 0.7, -player.size * 0.7);
    ctx.lineTo(-player.size * 0.7, player.size * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Inner triangle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(player.size * 0.5, 0);
    ctx.lineTo(-player.size * 0.3, -player.size * 0.35);
    ctx.lineTo(-player.size * 0.3, player.size * 0.35);
    ctx.closePath();
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.size, 0);
    ctx.lineTo(-player.size * 0.7, -player.size * 0.7);
    ctx.lineTo(-player.size * 0.7, player.size * 0.7);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
    ctx.shadowBlur = 0;
    
    // Green sparks shooting off triangle (always when game running)
    if (gameRunning) {
        // Constant green sparks
        for (let i = 0; i < 3; i++) {
            particles.push({
                x: player.x - player.size * 0.5 + (Math.random() - 0.5) * player.size,
                y: player.y + (Math.random() - 0.5) * player.size,
                vx: -Math.random() * 8 - 4,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 5 + 2,
                color: Math.random() > 0.3 ? '#00ff00' : '#88ff88',
                life: 0.6
            });
        }
        
        // Extra bright sparks occasionally
        if (Math.random() > 0.7) {
            particles.push({
                x: player.x,
                y: player.y + (Math.random() - 0.5) * player.size * 0.8,
                vx: -Math.random() * 12 - 6,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 6 + 4,
                color: '#ffffff',
                life: 0.4
            });
        }
    }
    
    // Extra engine burst when flying
    if (isFlying && gameRunning) {
        for (let i = 0; i < 2; i++) {
            particles.push({
                x: player.x - player.size * 0.7,
                y: player.y + (Math.random() - 0.5) * player.size * 0.5,
                vx: -Math.random() * 6 - 3,
                vy: (Math.random() - 0.5) * 3,
                size: Math.random() * 5 + 3,
                color: '#00ff00',
                life: 0.5
            });
        }
    }
}

function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize terrain for menu screen
initTerrain();

// Start the game loop
gameLoop();
