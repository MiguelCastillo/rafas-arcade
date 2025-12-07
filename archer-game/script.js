// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// Game state
const game = {
    player1Health: 100,
    maxHealth: 100, // Maximum health capacity
    damageMultiplier: 1.0, // Damage multiplier (1.0 = 100%, 1.25 = 125%, etc.)
    playerArrowActive: false,
    gameOver: false,
    paused: false, // Game paused when shop is open
    aiEnabled: true,
    aiShotCount: 0,
    mouseX: 0,
    mouseY: 0,
    isCharging: false,
    chargeStartTime: 0,
    currentPower: 0,
    currentAngle: 45,
    enemies: [], // Array to hold enemy data
    level: 1, // Current wave level
    maxLevel: 1, // Highest level reached
    headshotChance: 0.20, // 20% default
    bodyHitChance: 0.40, // 40% default
    enemyShootIntervals: [], // Store interval IDs for enemy shooting
    apples: [], // Array to hold falling apples
    appleSpawnInterval: null, // Interval ID for apple spawning
    points: 0, // Player points
    currentArrowType: 'normal' // Current equipped arrow type
};

// Arrow types and their costs
const arrowTypes = {
    normal: { name: 'Normal', cost: 0, color: '#8B4513', description: 'Standard arrow' },
    fire: { name: 'Fire', cost: 0, color: '#FF4500', description: 'Burns enemy for 3 damage/sec for 5 sec' },
    poison: { name: 'Poison', cost: 0, color: '#9400D3', description: 'Deals 2 damage/sec for 8 sec' },
    ice: { name: 'Ice', cost: 0, color: '#00BFFF', description: 'Freezes enemy for 3 seconds' },
    explosive: { name: 'Explosive', cost: 0, color: '#FF8C00', description: 'Explodes for area damage' },
    lightning: { name: 'Lightning', cost: 0, color: '#FFD700', description: 'Chains to nearby enemies' },
    healing: { name: 'Healing', cost: 0, color: '#32CD32', description: 'Apples give +75 HP instead' }
};

// Apple class
class Apple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.fallSpeed = 2 + Math.random() * 2; // 2-4 pixels per frame
        this.active = true;
    }

    update() {
        this.y += this.fallSpeed;
        
        // Remove if off screen
        if (this.y > canvas.height + 50) {
            this.active = false;
        }
    }

    draw() {
        // Draw apple body (red circle)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw apple highlight
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw stem
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x + 3, this.y - this.radius - 8);
        ctx.stroke();
        
        // Draw leaf
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.ellipse(this.x + 8, this.y - this.radius - 6, 6, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    checkHit(arrow) {
        const dx = arrow.x - this.x;
        const dy = arrow.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.radius + arrow.size;
    }
}

// Platform objects
const platform1 = {
    x: 0,
    y: 0,
    width: 120,
    height: 20,
    color: '#8B4513'
};

// Archer positions
const archer1 = {
    x: 0,
    y: 0,
    width: 30,
    height: 60,
    color: '#4CAF50'
};

// Add status effects tracking to enemies
function addStatusEffects(enemy) {
    if (!enemy.statusEffects) {
        enemy.statusEffects = {
            burn: null, // {damage: X, duration: Y, tickInterval}
            poison: null,
            frozen: null
        };
    }
}

// Enemy colors
const enemyColors = ['#f44336', '#9C27B0', '#FF9800'];
const bossColor = '#000000'; // Black for boss enemies

// Generate random platform positions and enemies based on level
function generatePlatforms(isNewGame = false) {
    const minHeight = canvas.height * 0.3;
    const maxHeight = canvas.height - 100;
    const minGap = 150;
    
    // Only reposition player platform on new game
    if (isNewGame) {
        platform1.x = Math.random() * (canvas.width * 0.25 - 100) + 50;
        platform1.y = Math.random() * (maxHeight - minHeight) + minHeight;
        archer1.x = platform1.x + (platform1.width - archer1.width) / 2;
        archer1.y = platform1.y - archer1.height;
    }
    
    // Determine if this is a boss level (every 5 levels)
    const isBossLevel = game.level % 5 === 0;
    let numEnemies;
    let hasBoss = false;
    
    if (isBossLevel) {
        // Boss level: 1 boss + 2 regular enemies
        numEnemies = 3;
        hasBoss = true;
    } else {
        // Regular level: random enemies
        const rand = Math.random();
        if (rand < 0.7) {
            numEnemies = 1;
        } else if (rand < 0.9) {
            numEnemies = 2;
        } else {
            numEnemies = 3;
        }
    }
    
    // Clear previous enemies
    game.enemies = [];
    
    // Generate enemies with platforms
    const usedPositions = [platform1];
    
    for (let i = 0; i < numEnemies; i++) {
        let validPosition = false;
        let attempts = 0;
        let enemyPlatform, enemyArcher;
        
        // First enemy on boss level is the boss
        const isBoss = hasBoss && i === 0;
        
        while (!validPosition && attempts < 100) {
            // Generate platform in right portion of screen
            enemyPlatform = {
                x: Math.random() * (canvas.width * 0.6 - 100) + (canvas.width * 0.4),
                y: Math.random() * (maxHeight - minHeight) + minHeight,
                width: isBoss ? 140 : 120, // Boss has bigger platform
                height: 20,
                color: '#8B4513'
            };
            
            // Check if platform doesn't overlap with any existing platforms
            validPosition = true;
            for (let j = 0; j < usedPositions.length; j++) {
                const other = usedPositions[j];
                const horizontalOverlap = !(enemyPlatform.x > other.x + other.width + minGap || 
                                           enemyPlatform.x + enemyPlatform.width < other.x - minGap);
                const verticalOverlap = Math.abs(enemyPlatform.y - other.y) < 80;
                
                if (horizontalOverlap && verticalOverlap) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        usedPositions.push(enemyPlatform);
        
        // Calculate scaling based on level (every 5 levels = +1 tier)
        const scalingTier = Math.floor(game.level / 5);
        const healthBonus = scalingTier * 25;
        
        // Create enemy archer on platform
        enemyArcher = {
            x: enemyPlatform.x + (enemyPlatform.width - (isBoss ? 40 : 30)) / 2,
            y: enemyPlatform.y - (isBoss ? 70 : 60),
            width: isBoss ? 40 : 30, // Boss is bigger
            height: isBoss ? 70 : 60,
            color: isBoss ? bossColor : enemyColors[i % enemyColors.length],
            health: (isBoss ? 200 : 100) + healthBonus, // Scales with level
            maxHealth: (isBoss ? 200 : 100) + healthBonus,
            isBoss: isBoss,
            platform: enemyPlatform,
            statusEffects: {
                burn: null,
                poison: null,
                frozen: null
            }
        };
        
        game.enemies.push(enemyArcher);
    }
}

// Arrow class
class Arrow {
    constructor(x, y, angle, power, direction, intendedHit = null, target = null, arrowType = 'normal') {
        this.x = x;
        this.y = y;
        // Boost power by 33% so 75% power equals old 100% power
        const boostedPower = power * 1.33;
        this.velocityX = Math.cos(angle) * boostedPower * direction;
        this.velocityY = -Math.sin(angle) * boostedPower;
        this.gravity = 0.2;
        this.size = 8;
        this.trail = [];
        this.intendedHit = intendedHit; // 'headshot', 'body', or 'miss'
        this.target = target; // Target archer object
        this.hasAutoAimed = false; // Track if auto-aim has been applied
        this.arrowType = arrowType; // Arrow type (normal, fire, poison, etc.)
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) {
            this.trail.shift();
        }

        // Auto-aiming for guaranteed hits
        if (this.intendedHit && this.intendedHit !== 'miss' && this.target && !this.hasAutoAimed) {
            // Calculate distance to target
            const targetX = this.target.x + this.target.width / 2;
            const targetY = this.intendedHit === 'headshot' ? 
                this.target.y - 10 : // Head position
                this.target.y + this.target.height / 2; // Body center
            
            const distToTarget = Math.sqrt(
                Math.pow(this.x - targetX, 2) + 
                Math.pow(this.y - targetY, 2)
            );
            
            // When arrow gets close enough, guide it to the target
            if (distToTarget < 150 && this.x > this.target.x - 100) {
                // Calculate direction to target
                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const angle = Math.atan2(dy, dx);
                
                // Adjust velocity to home in on target
                const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                this.velocityX = Math.cos(angle) * speed;
                this.velocityY = Math.sin(angle) * speed;
                
                // Mark that we've applied auto-aim
                this.hasAutoAimed = true;
            }
        }

        this.velocityY += this.gravity;
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw() {
        // Get arrow type color
        const arrowColor = arrowTypes[this.arrowType]?.color || '#8B4513';
        
        // Draw trail with arrow type color
        ctx.strokeStyle = arrowColor + '80'; // Add transparency
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.trail.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
        
        // Add special effects for certain arrow types
        if (this.arrowType === 'fire') {
            // Fire particles
            ctx.fillStyle = '#FF4500';
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                ctx.beginPath();
                ctx.arc(this.x + offsetX, this.y + offsetY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.arrowType === 'lightning') {
            // Lightning effect
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20);
                ctx.stroke();
            }
        }

        // Draw arrow
        const angle = Math.atan2(this.velocityY, this.velocityX);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Arrow shaft
        ctx.fillStyle = arrowColor;
        ctx.fillRect(-this.size, -2, this.size * 1.5, 4);
        
        // Arrow tip
        ctx.fillStyle = this.arrowType === 'ice' ? '#FFFFFF' : '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(this.size * 0.5, 0);
        ctx.lineTo(-2, -4);
        ctx.lineTo(-2, 4);
        ctx.closePath();
        ctx.fill();
        
        // Fletching
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(-this.size, -3);
        ctx.lineTo(-this.size - 5, -5);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-this.size, 3);
        ctx.lineTo(-this.size - 5, 5);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y > canvas.height;
    }

    checkHit(target) {
        // More generous hitbox for arrows that are supposed to hit
        const hitboxExpansion = (this.intendedHit === 'body' || this.intendedHit === 'headshot') ? 20 : 0;
        
        return (
            this.x > target.x - hitboxExpansion &&
            this.x < target.x + target.width + hitboxExpansion &&
            this.y > target.y - hitboxExpansion &&
            this.y < target.y + target.height + hitboxExpansion
        );
    }

    checkHeadshot(target) {
        // Head is at archer.y - 10 with radius 15
        const headX = target.x + target.width / 2;
        const headY = target.y - 10;
        // More generous radius for arrows that are supposed to hit the head
        const headRadius = this.intendedHit === 'headshot' ? 30 : 15;
        
        // Check if arrow is within head circle
        const dx = this.x - headX;
        const dy = this.y - headY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= headRadius;
    }
}

// Draw ground
function drawGround() {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    
    // Grass
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, canvas.height - 35, canvas.width, 5);
}

// Draw platforms
function drawPlatforms() {
    // Draw player platform
    drawSinglePlatform(platform1);
    
    // Draw enemy platforms
    game.enemies.forEach(enemy => {
        drawSinglePlatform(enemy.platform);
    });
}

function drawSinglePlatform(platform) {
    ctx.fillStyle = '#654321';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Platform border
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 3;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    
    // Wood texture lines
    ctx.strokeStyle = '#4a2f1a';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
        const y = platform.y + (platform.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(platform.x, y);
        ctx.lineTo(platform.x + platform.width, y);
        ctx.stroke();
    }
}

// Draw archer
function drawArcher(archer, isFacingRight) {
    // Body
    ctx.fillStyle = archer.color;
    ctx.fillRect(archer.x, archer.y, archer.width, archer.height);
    
    // Head (bigger for boss)
    const headRadius = archer.isBoss ? 20 : 15;
    ctx.fillStyle = archer.isBoss ? '#8B0000' : '#FFD700';
    ctx.beginPath();
    ctx.arc(
        archer.x + archer.width / 2,
        archer.y - (archer.isBoss ? 15 : 10),
        headRadius,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Boss crown
    if (archer.isBoss) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(archer.x + archer.width / 2 - 15, archer.y - 25);
        ctx.lineTo(archer.x + archer.width / 2 - 10, archer.y - 30);
        ctx.lineTo(archer.x + archer.width / 2 - 5, archer.y - 25);
        ctx.lineTo(archer.x + archer.width / 2, archer.y - 35);
        ctx.lineTo(archer.x + archer.width / 2 + 5, archer.y - 25);
        ctx.lineTo(archer.x + archer.width / 2 + 10, archer.y - 30);
        ctx.lineTo(archer.x + archer.width / 2 + 15, archer.y - 25);
        ctx.lineTo(archer.x + archer.width / 2 + 15, archer.y - 20);
        ctx.lineTo(archer.x + archer.width / 2 - 15, archer.y - 20);
        ctx.closePath();
        ctx.fill();
    }
    
    // Face
    ctx.fillStyle = '#000';
    const eyeY = archer.y - (archer.isBoss ? 18 : 13);
    if (isFacingRight) {
        ctx.fillRect(archer.x + archer.width / 2 + 3, eyeY, 3, 3);
    } else {
        ctx.fillRect(archer.x + archer.width / 2 - 6, eyeY, 3, 3);
    }
    
    // Bow (bigger for boss)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = archer.isBoss ? 4 : 3;
    ctx.beginPath();
    const bowRadius = archer.isBoss ? 25 : 20;
    if (isFacingRight) {
        ctx.arc(archer.x + archer.width + 10, archer.y + 30, bowRadius, -Math.PI / 3, Math.PI / 3);
    } else {
        ctx.arc(archer.x - 10, archer.y + 30, bowRadius, Math.PI * 2 / 3, Math.PI * 4 / 3);
    }
    ctx.stroke();
    
    // Boss health bar
    if (archer.isBoss && archer.health > 0) {
        const barWidth = 80;
        const barHeight = 8;
        const barX = archer.x + archer.width / 2 - barWidth / 2;
        const barY = archer.y - 50;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = archer.health / archer.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// Draw scene
function drawScene() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    drawCloud(100, 50);
    drawCloud(300, 80);
    drawCloud(500, 40);
    drawCloud(700, 70);
    
    drawGround();
    drawPlatforms();
    
    // Draw apples
    game.apples.forEach(apple => {
        if (apple.active) {
            apple.draw();
        }
    });
    
    drawArcher(archer1, true);
    
    // Draw all enemies
    game.enemies.forEach(enemy => {
        if (enemy.health > 0) {
            drawArcher(enemy, false);
            drawStatusEffects(enemy);
        }
    });
    
    // Draw aiming line and power meter anytime (not turn-based)
    if (!game.gameOver) {
        drawAimingLine();
        if (game.isCharging) {
            drawPowerMeter();
        }
    }
}

// Draw aiming line
function drawAimingLine() {
    const startX = archer1.x + archer1.width;
    const startY = archer1.y + 20;
    
    // Calculate angle based on mouse position
    const dx = game.mouseX - startX;
    const dy = game.mouseY - startY;
    const angle = Math.atan2(-dy, dx);
    game.currentAngle = Math.max(0, Math.min(Math.PI / 2, angle));
    
    // Draw aiming line
    const lineLength = 100;
    const endX = startX + Math.cos(game.currentAngle) * lineLength;
    const endY = startY - Math.sin(game.currentAngle) * lineLength;
    
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw arrow tip at end
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fill();
}

// Draw power meter
function drawPowerMeter() {
    const elapsed = Date.now() - game.chargeStartTime;
    game.currentPower = Math.min(100, (elapsed / 5)); // Reaches max in 0.5 seconds
    
    // Draw power bar
    const barX = archer1.x - 20;
    const barY = archer1.y - 40;
    const barWidth = 70;
    const barHeight = 10;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Power fill
    const powerWidth = (game.currentPower / 100) * barWidth;
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#FFC107');
    gradient.addColorStop(1, '#f44336');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, powerWidth, barHeight);
    
    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Power text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`${Math.round(game.currentPower)}%`, barX + barWidth + 10, barY + 9);
    ctx.fillText(`${Math.round(game.currentPower)}%`, barX + barWidth + 10, barY + 9);
}

function drawCloud(x, y) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 20, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 40, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

// Update UI
function updateUI() {
    const healthPercent = (game.player1Health / game.maxHealth) * 100;
    document.getElementById('health1').style.width = healthPercent + '%';
    document.getElementById('health1-text').textContent = `${game.player1Health}/${game.maxHealth}`;
    
    // Update for first enemy (always exists)
    if (game.enemies.length > 0) {
        const firstEnemy = game.enemies[0];
        const healthPercent = (firstEnemy.health / firstEnemy.maxHealth) * 100;
        document.getElementById('health2').style.width = healthPercent + '%';
        document.getElementById('health2-text').textContent = firstEnemy.health;
    }
    
    const totalEnemies = game.enemies.length;
    const aliveEnemies = game.enemies.filter(e => e.health > 0).length;
    const isBossLevel = game.level % 5 === 0;
    const levelText = isBossLevel ? `Level ${game.level} 👑 BOSS WAVE!` : `Level ${game.level}`;
    const enemyText = `${aliveEnemies}/${totalEnemies} enemies`;
    document.getElementById('turn-indicator').textContent = `${levelText} - ${enemyText}`;
    
    // Update points display
    document.getElementById('points-display').textContent = game.points;
    
    // Update current arrow display
    const arrowInfo = arrowTypes[game.currentArrowType];
    document.getElementById('current-arrow').textContent = arrowInfo.name;
    document.getElementById('current-arrow').style.color = arrowInfo.color;
    
    // Update health button state in shop
    const healthBtn = document.querySelector('.health-btn');
    if (healthBtn) {
        const canBuy = game.points >= 20;
        healthBtn.disabled = !canBuy;
        
        if (game.points < 20) {
            healthBtn.textContent = 'Need 20 Points';
        } else {
            healthBtn.textContent = 'Buy +50 Max HP';
        }
    }
    
    // Update damage button state in shop
    const damageBtn = document.querySelector('.damage-btn');
    if (damageBtn) {
        const canBuy = game.points >= 25;
        damageBtn.disabled = !canBuy;
        
        if (game.points < 25) {
            damageBtn.textContent = 'Need 25 Points';
        } else {
            damageBtn.textContent = 'Buy +25% Damage';
        }
    }
}

// Shoot arrow
function shootArrow(angle = null, power = null, shooterEnemy = null, intendedHit = null) {
    if (game.gameOver) return;
    
    const isPlayerShot = (angle === null && power === null);
    
    // Check if player already has an arrow active
    if (isPlayerShot && game.playerArrowActive) return;

    // Use provided angle/power or get from player's aim
    if (angle === null) {
        angle = game.currentAngle;
        power = Math.max(10, game.currentPower) / 6;
    } else {
        // AI shot - angle already in radians
        power = power / 6;
    }
    
    let startX, startY, direction, target;
    
    if (isPlayerShot) {
        // Player shooting
        startX = archer1.x + archer1.width;
        startY = archer1.y + 20;
        direction = 1;
        target = null; // Player doesn't need auto-aim
        game.playerArrowActive = true;
    } else {
        // Enemy shooting
        startX = shooterEnemy.x;
        startY = shooterEnemy.y + 20;
        direction = -1;
        target = archer1; // AI targets the player
    }

    const arrow = new Arrow(startX, startY, angle, power, direction, intendedHit, target, isPlayerShot ? game.currentArrowType : 'normal');

    // Animation loop
    function animate() {
        drawScene();
        arrow.update();
        arrow.draw();

        // Check if player arrow hit an apple
        if (isPlayerShot) {
            for (let apple of game.apples) {
                if (apple.active && apple.checkHit(arrow)) {
                    // Hit an apple!
                    apple.active = false;
                    const healAmount = arrow.arrowType === 'healing' ? 75 : 50;
                    game.player1Health = Math.min(game.maxHealth, game.player1Health + healAmount);
                    
                    // Show heal effect
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(apple.x, apple.y, 30, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Show heal text
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = '#00FF00';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    const healText = `+${healAmount} HP`;
                    ctx.strokeText(healText, apple.x - 35, apple.y - 20);
                    ctx.fillText(healText, apple.x - 35, apple.y - 20);
                    
                    updateUI();
                    game.playerArrowActive = false;
                    return;
                }
            }
        }

        // Check for hits against all possible targets
        let hitTarget = null;
        let isHeadshot = false;
        let isBodyHit = false;
        
        if (isPlayerShot) {
            // Check if player's arrow hit any enemy
            for (let enemy of game.enemies) {
                if (enemy.health > 0) {
                    if (arrow.checkHeadshot(enemy)) {
                        hitTarget = enemy;
                        isHeadshot = true;
                        break;
                    } else if (arrow.checkHit(enemy)) {
                        hitTarget = enemy;
                        isBodyHit = true;
                        break;
                    }
                }
            }
        } else {
            // Check if enemy's arrow hit player
            if (arrow.checkHeadshot(archer1)) {
                hitTarget = archer1;
                isHeadshot = true;
            } else if (arrow.checkHit(archer1)) {
                hitTarget = archer1;
                isBodyHit = true;
            }
        }
        
        if (hitTarget && (isHeadshot || isBodyHit)) {
            // Calculate damage based on hit type
            let damage;
            let hitMessage = '';
            
            if (isHeadshot) {
                damage = Math.floor(Math.random() * 20) + 35; // 35-55 damage for headshot
                hitMessage = '💀 HEADSHOT! 💀';
            } else {
                damage = Math.floor(Math.random() * 20) + 15; // 15-35 damage for body shot
            }
            
            // Apply damage multiplier for player shots
            if (isPlayerShot) {
                damage = Math.floor(damage * game.damageMultiplier);
            } else {
                // Apply enemy scaling damage multiplier (10% per 5 levels)
                const scalingTier = Math.floor(game.level / 5);
                const enemyDamageMultiplier = 1 + (scalingTier * 0.10);
                damage = Math.floor(damage * enemyDamageMultiplier);
            }
            
            // Apply damage
            if (isPlayerShot) {
                const enemyKilled = hitTarget.health > 0 && (hitTarget.health - damage) <= 0;
                hitTarget.health = Math.max(0, hitTarget.health - damage);
                
                // Award points for kill
                if (enemyKilled) {
                    game.points += 5;
                }
                
                // Apply special arrow effects
                addStatusEffects(hitTarget);
                if (arrow.arrowType === 'fire') {
                    hitTarget.statusEffects.burn = { damage: 3, duration: 5, tickRate: 1000, lastTick: Date.now() };
                    
                    // Fire visual effect
                    ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 / 8) * i;
                        const dist = 30 + Math.random() * 20;
                        ctx.beginPath();
                        ctx.arc(hitTarget.x + hitTarget.width/2 + Math.cos(angle) * dist, 
                               hitTarget.y + hitTarget.height/2 + Math.sin(angle) * dist, 
                               5 + Math.random() * 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (arrow.arrowType === 'poison') {
                    hitTarget.statusEffects.poison = { damage: 2, duration: 8, tickRate: 1000, lastTick: Date.now() };
                    
                    // Poison cloud visual
                    ctx.fillStyle = 'rgba(148, 0, 211, 0.4)';
                    ctx.beginPath();
                    ctx.arc(hitTarget.x + hitTarget.width/2, hitTarget.y + hitTarget.height/2, 40, 0, Math.PI * 2);
                    ctx.fill();
                } else if (arrow.arrowType === 'ice') {
                    hitTarget.statusEffects.frozen = { duration: 3, startTime: Date.now() };
                    
                    // Ice shards visual
                    ctx.strokeStyle = '#00BFFF';
                    ctx.lineWidth = 3;
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 / 6) * i;
                        const dist = 35;
                        ctx.beginPath();
                        ctx.moveTo(hitTarget.x + hitTarget.width/2, hitTarget.y + hitTarget.height/2);
                        ctx.lineTo(hitTarget.x + hitTarget.width/2 + Math.cos(angle) * dist, 
                                  hitTarget.y + hitTarget.height/2 + Math.sin(angle) * dist);
                        ctx.stroke();
                    }
                } else if (arrow.arrowType === 'explosive') {
                    // Explosion visual
                    ctx.fillStyle = 'rgba(255, 140, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(hitTarget.x + hitTarget.width/2, hitTarget.y + hitTarget.height/2, 150, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#FF4500';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(hitTarget.x + hitTarget.width/2, hitTarget.y + hitTarget.height/2, 150, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Explosive damage to nearby enemies
                    const explosiveDamage = Math.floor(20 * game.damageMultiplier);
                    game.enemies.forEach(enemy => {
                        if (enemy !== hitTarget && enemy.health > 0) {
                            const dist = Math.sqrt(Math.pow(enemy.x - hitTarget.x, 2) + Math.pow(enemy.y - hitTarget.y, 2));
                            if (dist < 150) {
                                enemy.health = Math.max(0, enemy.health - explosiveDamage);
                                
                                // Show explosion damage on affected enemies
                                ctx.font = 'bold 20px Arial';
                                ctx.fillStyle = '#FF8C00';
                                ctx.strokeStyle = '#000';
                                ctx.lineWidth = 2;
                                ctx.strokeText(`-${explosiveDamage}`, enemy.x + enemy.width/2 - 15, enemy.y - 10);
                                ctx.fillText(`-${explosiveDamage}`, enemy.x + enemy.width/2 - 15, enemy.y - 10);
                            }
                        }
                    });
                } else if (arrow.arrowType === 'lightning') {
                    // Chain to nearest enemy
                    let nearestEnemy = null;
                    let nearestDist = Infinity;
                    game.enemies.forEach(enemy => {
                        if (enemy !== hitTarget && enemy.health > 0) {
                            const dist = Math.sqrt(Math.pow(enemy.x - hitTarget.x, 2) + Math.pow(enemy.y - hitTarget.y, 2));
                            if (dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = enemy;
                            }
                        }
                    });
                    if (nearestEnemy && nearestDist < 300) {
                        const lightningDamage = Math.floor(15 * game.damageMultiplier);
                        nearestEnemy.health = Math.max(0, nearestEnemy.health - lightningDamage);
                        
                        // Lightning chain visual
                        ctx.strokeStyle = '#FFD700';
                        ctx.lineWidth = 4;
                        ctx.shadowColor = '#FFD700';
                        ctx.shadowBlur = 10;
                        
                        // Draw jagged lightning bolt
                        ctx.beginPath();
                        ctx.moveTo(hitTarget.x + hitTarget.width/2, hitTarget.y + hitTarget.height/2);
                        
                        const steps = 5;
                        for (let i = 1; i <= steps; i++) {
                            const t = i / steps;
                            const x = hitTarget.x + hitTarget.width/2 + (nearestEnemy.x - hitTarget.x) * t;
                            const y = hitTarget.y + hitTarget.height/2 + (nearestEnemy.y - hitTarget.y) * t;
                            const offset = (Math.random() - 0.5) * 30;
                            ctx.lineTo(x + offset, y + offset);
                        }
                        ctx.lineTo(nearestEnemy.x + nearestEnemy.width/2, nearestEnemy.y + nearestEnemy.height/2);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                        
                        // Show chain damage
                        ctx.font = 'bold 20px Arial';
                        ctx.fillStyle = '#FFD700';
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        ctx.strokeText(`-${lightningDamage}`, nearestEnemy.x + nearestEnemy.width/2 - 15, nearestEnemy.y - 10);
                        ctx.fillText(`-${lightningDamage}`, nearestEnemy.x + nearestEnemy.width/2 - 15, nearestEnemy.y - 10);
                    }
                }
            } else {
                game.player1Health = Math.max(0, game.player1Health - damage);
            }
            
            // Flash effect
            const flashColor = isHeadshot ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)';
            ctx.fillStyle = flashColor;
            ctx.fillRect(hitTarget.x - 20, hitTarget.y - 20, hitTarget.width + 40, hitTarget.height + 40);
            
            // Display damage text
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = isHeadshot ? '#FFD700' : '#FF0000';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            const damageText = `-${damage}`;
            const textX = hitTarget.x + hitTarget.width / 2 - 20;
            const textY = hitTarget.y - 30;
            ctx.strokeText(damageText, textX, textY);
            ctx.fillText(damageText, textX, textY);
            
            // Display headshot message
            if (isHeadshot) {
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                const msgX = hitTarget.x + hitTarget.width / 2 - 70;
                const msgY = hitTarget.y - 55;
                ctx.strokeText(hitMessage, msgX, msgY);
                ctx.fillText(hitMessage, msgX, msgY);
            }
            
            updateUI();
            
            if (isPlayerShot) {
                game.playerArrowActive = false;
            }
            
            checkGameOver();
            return;
        }

        if (arrow.isOffScreen()) {
            // Miss - allow shooting again
            if (isPlayerShot) {
                game.playerArrowActive = false;
            }
            drawScene();
            return;
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// Enemy shoots automatically - called by interval
function enemyShoot(enemy) {
    if (game.gameOver || enemy.health <= 0 || game.paused) return;
    
    // Check if enemy is frozen
    if (enemy.statusEffects && enemy.statusEffects.frozen) {
        return; // Frozen enemies can't shoot
    }
    
    // Increment shot count
    game.aiShotCount++;
    
    // Determine hit outcome using probability (configurable)
    const hitRoll = Math.random();
    let targetX, targetY, willHit;
    
    if (hitRoll < game.headshotChance) {
        // Headshot - aim at player's head
        targetX = archer1.x + archer1.width / 2;
        targetY = archer1.y - 10; // Head position
        willHit = 'headshot';
    } else if (hitRoll < game.headshotChance + game.bodyHitChance) {
        // Body hit - aim at player's body center
        targetX = archer1.x + archer1.width / 2;
        targetY = archer1.y + archer1.height / 2;
        willHit = 'body';
    } else {
        // Miss - aim somewhere off target
        const missOffset = (Math.random() - 0.5) * 300;
        targetX = archer1.x + archer1.width / 2 + missOffset;
        targetY = archer1.y + (Math.random() - 0.5) * 150;
        willHit = 'miss';
    }
    
    // Calculate trajectory to hit target
    const dx = targetX - enemy.x;
    const dy = enemy.y - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let angleToTarget, finalPower;
    
    if (willHit !== 'miss') {
        // For hits, use accurate ballistics calculation
        const horizontalDist = Math.abs(dx);
        const heightDiff = dy;
        
        // Choose angle based on distance (farther = higher angle)
        let shootAngle;
        if (horizontalDist < 300) {
            shootAngle = 0.6 + (horizontalDist / 1000);
        } else if (horizontalDist < 600) {
            shootAngle = 0.7 + (horizontalDist / 1500);
        } else {
            shootAngle = 0.85;
        }
        
        // Adjust angle based on height
        if (heightDiff > 0) {
            shootAngle += heightDiff / 200;
        } else {
            shootAngle -= Math.abs(heightDiff) / 300;
        }
        
        // Clamp angle
        shootAngle = Math.max(0.4, Math.min(Math.PI / 2 - 0.2, shootAngle));
        
        // Calculate power based on distance
        let shootPower = 50 + (horizontalDist / 10);
        shootPower *= (1 + shootAngle / 2);
        shootPower = Math.max(60, Math.min(100, shootPower));
        
        angleToTarget = shootAngle;
        finalPower = shootPower;
    } else {
        // For misses, use simple calculation that aims off-target
        angleToTarget = Math.atan2(dy, -dx);
        angleToTarget = Math.max(0, Math.min(Math.PI/2, angleToTarget + 0.3));
        const basePower = Math.sqrt(distance) * 9;
        finalPower = Math.max(40, Math.min(100, basePower));
    }
    
    shootArrow(angleToTarget, finalPower, enemy, willHit);
}

// Start auto-shooting for all enemies
function startEnemyAutoShoot() {
    // Clear any existing intervals
    stopEnemyAutoShoot();
    
    // Set up shooting intervals for each enemy
    game.enemies.forEach((enemy, index) => {
        // Stagger enemy shots slightly
        const initialDelay = index * 400;
        setTimeout(() => {
            const intervalId = setInterval(() => {
                enemyShoot(enemy);
            }, 3500); // Shoot every 3.5 seconds
            game.enemyShootIntervals.push(intervalId);
        }, initialDelay);
    });
}

// Stop all enemy auto-shooting
function stopEnemyAutoShoot() {
    game.enemyShootIntervals.forEach(intervalId => clearInterval(intervalId));
    game.enemyShootIntervals = [];
}

// Spawn apples
function spawnApple() {
    if (game.gameOver) return;
    
    // Random x position across the screen
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = -30; // Start above screen
    
    const apple = new Apple(x, y);
    game.apples.push(apple);
    
    // Clean up inactive apples
    game.apples = game.apples.filter(apple => apple.active);
}

// Start apple spawning
function startAppleSpawning() {
    stopAppleSpawning();
    // Spawn an apple every 3-5 seconds
    function scheduleNextApple() {
        const delay = 3000 + Math.random() * 2000; // 3-5 seconds
        game.appleSpawnInterval = setTimeout(() => {
            spawnApple();
            scheduleNextApple();
        }, delay);
    }
    scheduleNextApple();
}

// Stop apple spawning
function stopAppleSpawning() {
    if (game.appleSpawnInterval) {
        clearTimeout(game.appleSpawnInterval);
        game.appleSpawnInterval = null;
    }
}

// Update apples
function updateApples() {
    game.apples.forEach(apple => {
        if (apple.active) {
            apple.update();
        }
    });
    
    // Clean up inactive apples
    game.apples = game.apples.filter(apple => apple.active || apple.y < canvas.height + 100);
}

// Update status effects on enemies
function updateStatusEffects() {
    game.enemies.forEach(enemy => {
        if (!enemy.statusEffects || enemy.health <= 0) return;
        
        const now = Date.now();
        
        // Burn effect
        if (enemy.statusEffects.burn) {
            const burn = enemy.statusEffects.burn;
            if (now - burn.lastTick >= burn.tickRate) {
                const wasAlive = enemy.health > 0;
                enemy.health = Math.max(0, enemy.health - burn.damage);
                burn.lastTick = now;
                burn.duration -= 1;
                
                // Award points if burn kills enemy
                if (wasAlive && enemy.health <= 0) {
                    game.points += 5;
                }
                
                if (burn.duration <= 0) {
                    enemy.statusEffects.burn = null;
                }
            }
        }
        
        // Poison effect
        if (enemy.statusEffects.poison) {
            const poison = enemy.statusEffects.poison;
            if (now - poison.lastTick >= poison.tickRate) {
                const wasAlive = enemy.health > 0;
                enemy.health = Math.max(0, enemy.health - poison.damage);
                poison.lastTick = now;
                poison.duration -= 1;
                
                // Award points if poison kills enemy
                if (wasAlive && enemy.health <= 0) {
                    game.points += 5;
                }
                
                if (poison.duration <= 0) {
                    enemy.statusEffects.poison = null;
                }
            }
        }
        
        // Frozen effect
        if (enemy.statusEffects.frozen) {
            const frozen = enemy.statusEffects.frozen;
            if ((now - frozen.startTime) / 1000 >= frozen.duration) {
                enemy.statusEffects.frozen = null;
            }
        }
    });
    
    updateUI(); // Update UI when status effects tick
}

// Draw status effect indicators
function drawStatusEffects(enemy) {
    if (!enemy.statusEffects || enemy.health <= 0) return;
    
    let iconX = enemy.x;
    const iconY = enemy.y - 60;
    
    // Burn icon with particle effects
    if (enemy.statusEffects.burn) {
        // Fire particles rising
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = Math.random() * 30;
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.3 + Math.random() * 0.4})`;
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width/2 + offsetX, enemy.y + enemy.height - offsetY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.font = 'bold 20px Arial';
        ctx.fillText('🔥', iconX, iconY);
        iconX += 25;
    }
    
    // Poison icon with bubbles
    if (enemy.statusEffects.poison) {
        // Poison bubbles
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = Math.random() * 25;
            ctx.fillStyle = `rgba(148, 0, 211, ${0.3 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width/2 + offsetX, enemy.y + enemy.height - offsetY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.font = 'bold 20px Arial';
        ctx.fillText('☠️', iconX, iconY);
        iconX += 25;
    }
    
    // Frozen icon with ice overlay
    if (enemy.statusEffects.frozen) {
        // Ice overlay on enemy
        ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
        ctx.fillRect(enemy.x - 5, enemy.y - 5, enemy.width + 10, enemy.height + 10);
        
        ctx.font = 'bold 20px Arial';
        ctx.fillText('❄️', iconX, iconY);
        iconX += 25;
    }
}

// Check game over or next wave
function checkGameOver() {
    const allEnemiesDead = game.enemies.every(e => e.health <= 0);
    
    if (game.player1Health <= 0) {
        // Player died - game over
        game.gameOver = true;
        stopEnemyAutoShoot();
        stopAppleSpawning();
        game.maxLevel = Math.max(game.maxLevel, game.level);
        document.getElementById('winner-text').innerHTML = `💀 Game Over! 💀<br>You reached Level ${game.level}`;
        document.getElementById('game-over').classList.remove('hidden');
    } else if (allEnemiesDead) {
        // Wave cleared - start next level
        stopEnemyAutoShoot();
        game.level++;
        game.maxLevel = Math.max(game.maxLevel, game.level);
        
        // Show wave cleared message
        drawScene();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#00FF00';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        const waveText = `Wave ${game.level - 1} Cleared!`;
        const textWidth = ctx.measureText(waveText).width;
        ctx.strokeText(waveText, canvas.width / 2 - textWidth / 2, canvas.height / 2 - 30);
        ctx.fillText(waveText, canvas.width / 2 - textWidth / 2, canvas.height / 2 - 30);
        
        // Show next wave info
        const nextWaveInfo = game.level % 5 === 0 ? '👑 BOSS WAVE INCOMING! 👑' : `Starting Wave ${game.level}...`;
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = game.level % 5 === 0 ? '#FFD700' : '#FFFFFF';
        const infoWidth = ctx.measureText(nextWaveInfo).width;
        ctx.strokeText(nextWaveInfo, canvas.width / 2 - infoWidth / 2, canvas.height / 2 + 30);
        ctx.fillText(nextWaveInfo, canvas.width / 2 - infoWidth / 2, canvas.height / 2 + 30);
        
        // Start next wave after delay
        setTimeout(() => {
            generatePlatforms(false); // Don't reposition player
            startEnemyAutoShoot(); // Start enemy auto-shooting
            updateUI();
            drawScene();
        }, 2500);
    }
}

// Restart game
function restartGame() {
    stopEnemyAutoShoot();
    stopAppleSpawning();
    game.player1Health = game.maxHealth; // Restore to current max health (keeps upgrades!)
    // game.maxHealth stays the same - health upgrades are permanent!
    game.playerArrowActive = false;
    game.gameOver = false;
    game.aiShotCount = 0; // Reset AI accuracy
    game.level = 1; // Reset to level 1
    game.apples = []; // Clear apples
    game.points = 0; // Reset points
    game.currentArrowType = 'normal'; // Reset to normal arrows
    
    document.getElementById('game-over').classList.add('hidden');
    
    // Generate new random platform positions and enemies
    generatePlatforms(true);
    startEnemyAutoShoot();
    startAppleSpawning();
    
    updateUI();
    drawScene();
}

// Mouse event listeners for canvas
// Main game loop for continuous updates
function gameLoop() {
    if (!game.gameOver && !game.paused) {
        updateApples();
        updateStatusEffects();
        drawScene();
    } else if (!game.gameOver && game.paused) {
        // Still draw the scene when paused, just don't update
        drawScene();
        
        // Draw pause overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        const pauseText = 'PAUSED';
        const textWidth = ctx.measureText(pauseText).width;
        ctx.strokeText(pauseText, canvas.width / 2 - textWidth / 2, canvas.height / 2);
        ctx.fillText(pauseText, canvas.width / 2 - textWidth / 2, canvas.height / 2);
    }
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.mouseX = e.clientX - rect.left;
    game.mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (game.gameOver || game.playerArrowActive || game.paused) return;
    
    game.isCharging = true;
    game.chargeStartTime = Date.now();
    game.currentPower = 0;
    
    // Animation loop for power charging
    function chargePower() {
        if (game.isCharging && !game.paused) {
            drawScene();
            requestAnimationFrame(chargePower);
        }
    }
    chargePower();
});

canvas.addEventListener('mouseup', (e) => {
    if (game.isCharging && !game.paused) {
        game.isCharging = false;
        shootArrow();
    }
});

canvas.addEventListener('mouseleave', (e) => {
    if (game.isCharging) {
        game.isCharging = false;
        game.currentPower = 0;
        if (!game.paused) {
            drawScene();
        }
    }
});

// Shop functions
function buyArrow(arrowType) {
    const arrow = arrowTypes[arrowType];
    game.currentArrowType = arrowType;
    updateUI();
    
    // Show equipped message without alert (less intrusive)
    const message = document.createElement('div');
    message.className = 'equipped-message';
    message.innerHTML = `✓ Equipped ${arrow.name} Arrow!`;
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${arrow.color};
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 1.5em;
        font-weight: bold;
        z-index: 3000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        animation: fadeOut 1s ease-in-out;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 1000);
}

function buyHealth() {
    const healthCost = 20;
    const maxHealthIncrease = 50;
    
    // Check if player has enough points
    if (game.points < healthCost) {
        showMessage('Not enough points!', '#FF1744');
        return;
    }
    
    // Deduct points
    game.points -= healthCost;
    
    // Increase max health by 50
    game.maxHealth += maxHealthIncrease;
    
    // Restore to full health at new max
    game.player1Health = game.maxHealth;
    
    updateUI();
    
    // Show success message with new max health
    showMessage(`Max Health: ${game.maxHealth} HP! ❤️`, '#4CAF50');
}

function buyDamage() {
    const damageCost = 25;
    const damageIncrease = 0.25; // 25% increase
    
    // Check if player has enough points
    if (game.points < damageCost) {
        showMessage('Not enough points!', '#FF1744');
        return;
    }
    
    // Deduct points
    game.points -= damageCost;
    
    // Increase damage multiplier by 25%
    game.damageMultiplier += damageIncrease;
    
    updateUI();
    
    // Show success message with new damage percentage
    const damagePercent = Math.round(game.damageMultiplier * 100);
    showMessage(`Damage: ${damagePercent}% ⚔️`, '#4CAF50');
}

function showMessage(text, color) {
    const message = document.createElement('div');
    message.className = 'shop-message';
    message.innerHTML = text;
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${color};
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 1.5em;
        font-weight: bold;
        z-index: 3000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        animation: fadeOut 1s ease-in-out;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 1000);
}

function toggleShop() {
    const shop = document.getElementById('shop');
    const isOpening = shop.classList.contains('hidden');
    shop.classList.toggle('hidden');
    
    // Pause/unpause game
    game.paused = isOpening;
}

// Event listeners
document.getElementById('restart-btn').addEventListener('click', restartGame);
document.getElementById('shop-btn').addEventListener('click', toggleShop);

// Add keyboard shortcut to close shop (ESC key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && game.paused) {
        toggleShop();
    }
});

// Difficulty controls
const headshotSlider = document.getElementById('headshot-chance');
const bodyhitSlider = document.getElementById('bodyhit-chance');
const headshotValueSpan = document.getElementById('headshot-value');
const bodyhitValueSpan = document.getElementById('bodyhit-value');
const missValueSpan = document.getElementById('miss-value');

function updateMissChance() {
    const missChance = Math.max(0, 100 - (game.headshotChance * 100) - (game.bodyHitChance * 100));
    missValueSpan.textContent = missChance.toFixed(0);
}

headshotSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    game.headshotChance = value / 100;
    headshotValueSpan.textContent = value;
    updateMissChance();
});

bodyhitSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    game.bodyHitChance = value / 100;
    bodyhitValueSpan.textContent = value;
    updateMissChance();
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    archer1.y = canvas.height - 100;
    archer2.x = canvas.width - 110;
    archer2.y = canvas.height - 100;
    
    drawScene();
});

// Initialize
generatePlatforms(true);
startEnemyAutoShoot();
startAppleSpawning();
gameLoop(); // Start main game loop
updateUI();
updateMissChance();

