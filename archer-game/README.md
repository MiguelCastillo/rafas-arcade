# 🏹 Archer Battle - Real-Time Survival

An exciting real-time archery battle game! Shoot freely while enemies auto-fire every 2 seconds. Battle through increasingly difficult waves and face powerful bosses every 5 levels!

## How to Play

1. Open `index.html` in your web browser
2. You control the archer on the left (green), enemies spawn on the right
3. **Move your mouse** over the game canvas to aim (yellow line shows trajectory)
4. **Hold down the mouse button** to charge power (bar fills up)
5. **Release** to fire your arrow at the charged power!
6. Enemies shoot automatically every 2 seconds - dodge and shoot!
7. **Open shop** (🛒 button) to switch arrow types - game pauses while shop is open
8. **Close shop** by clicking ✖, "Resume Game" button, or pressing ESC
9. Defeat all enemies to advance to the next wave!
10. Survive as many levels as you can!

## Features

- 🌊 **Endless Wave Survival Mode** - How many levels can you survive?
- 🏆 **Points System** - Earn 5 points per enemy defeated!
- 🛒 **Arrow Selection Shop** - Switch between 7 different arrow types (ALL FREE!)
  - **Game pauses** when shop is open - safe to browse!
  - **Exit shop:** Click ✖ button, "Resume Game" button, or press ESC
  - **Fire Arrow** - Burns enemy for 3 damage/sec for 5 seconds
  - **Poison Arrow** - Deals 2 damage/sec for 8 seconds  
  - **Ice Arrow** - Freezes enemy for 3 seconds
  - **Explosive Arrow** - Explodes for area damage (20 dmg in 150px radius)
  - **Lightning Arrow** - Chains to nearest enemy within 300px (15 dmg)
  - **Healing Arrow** - Apples give +75 HP instead of +50
  - **Normal Arrow** - Standard arrow
- 🍎 **Falling Apples** - Shoot them for +50 HP healing!
- 🎯 **Customizable Probability-Based Combat** - Adjust enemy accuracy!
  - **Headshot slider** (0-50%, default 20%) - Enemy arrows aim for your head
  - **Body hit slider** (0-100%, default 40%) - Enemy arrows aim for your body
  - **Miss chance** calculated automatically (default 40%)
  - **Change difficulty anytime** using the UI sliders!
- 👑 **Boss Waves Every 5 Levels:**
  - Level 5, 10, 15, etc. spawn a BOSS enemy
  - Boss has 200 HP (double health)
  - Boss uses same hit probabilities as regular enemies
  - Boss is bigger and has a crown
  - Boss waves include 2 additional regular enemies
- 🎲 **Random Enemy Spawns:** Regular levels have 1-3 random enemies
- 🖱️ Intuitive mouse controls - aim and hold to charge!
- 🏗️ Random platform positioning - every wave is different!
- 📊 Visual aiming line and power meter
- 🎯 Physics-based arrow trajectory with realistic ballistics
- 💚 Health bars for all players (boss has visible health bar)
- 🎨 Beautiful design with color-coded enemies and boss
- ⚔️ Real-time gameplay - shoot anytime, enemies auto-fire every 2 seconds!
- 🏆 Level tracking with highest level reached

## Game Mechanics

### Combat
- **Real-time combat:** Shoot whenever you want - no waiting for turns!
- **Enemy auto-shooting:** Each enemy shoots automatically every 2 seconds
- **Body shots** deal 15-35 damage
- **HEADSHOTS** deal 35-55 damage (with special golden flash!)
- **Points & Rewards:** Earn 5 points for each enemy defeated (track your score!)
- **Arrow Selection:** Switch between special arrows anytime (all FREE!)
  - Status effects are shown above enemies with icons (🔥☠️❄️)
  - Burn and poison deal damage over time
  - Ice freezes enemies (stops their shooting temporarily)
  - Explosive and lightning hit multiple targets
- **Falling apples:** Shoot them for +50 HP! (max 100 HP)
  - Apples spawn every 3-5 seconds
  - They fall from the sky and disappear if they hit the ground
  - Heal yourself mid-battle by hitting them with arrows!
  - Healing arrows boost apple healing to +75 HP!
- Arrows are affected by gravity - adjust for distance and height
- Strategic angle and power selection is key to survival!
- Can only have 1 arrow active at a time - shoot fast!

### Wave System
- **Clear all enemies** to advance to the next level
- **Regular levels** (1-4, 6-9, 11-14, etc.): 1-3 random enemies spawn
- **Boss levels** (5, 10, 15, 20, etc.): 1 boss + 2 regular enemies
- Player platform stays in same position between waves
- Enemy platforms randomize each wave

### Enemy Types
- **Regular Enemies:** 100 HP, 20% headshot / 40% body hit / 40% miss
- **Boss Enemies:** 200 HP, same hit rates, bigger size, crown decoration

### Enemy Shooting Mechanics
- **Customizable probability-based aiming:** Adjust sliders to set difficulty
- **Auto-aiming system:** Arrows that are supposed to hit will home in on their target!
- **Headshot chance** (configurable): Arrows aim directly at your head (35-55 damage)
- **Body hit chance** (configurable): Arrows aim at your body center (15-35 damage)
- **Miss chance** (auto-calculated): Arrows aim off-target and miss you
- Arrows use physics-based trajectories with auto-correction when close to target
- Generous hitboxes ensure arrows connect when they're supposed to hit
- All enemies (including bosses) use the same hit probabilities
- **Difficulty presets:**
  - Easy: 5% headshot, 20% body (75% miss)
  - Normal: 20% headshot, 40% body (40% miss) - Default
  - Hard: 30% headshot, 60% body (10% miss)
  - Extreme: 40% headshot, 60% body (0% miss)
- Adjust anytime to make the game easier or harder!
- Aim for headshots to take down enemies faster! 💀

## Tech Stack

- HTML5 Canvas for game rendering
- Vanilla JavaScript for game logic
- CSS3 for styling and animations

Enjoy the battle! 🏹⚔️

