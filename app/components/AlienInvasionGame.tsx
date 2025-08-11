'use client';

import { useEffect, useRef, useState } from 'react';
import AudioManager from './AudioManager';
import PWAInstaller from './PWAInstaller';

const GameState = {
    WALKING: 'walking',
    SEEING_ALIENS: 'seeing_aliens',
    RUNNING_HOME: 'running_home',
    PREPARING: 'preparing',
    CONFRONTING: 'confronting',
    FIGHTING: 'fighting',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    direction: number;
    health: number;
    maxHealth: number;
    damage: number;
    fireRate: number;
    lastShot: number;
    color: string;
    superAttackReady: boolean;
    superAttackCharging: boolean;
    superAttackTimer: number;
    lastSuperAttack: number;
    superCooldown: number;
}

interface Alien {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    health: number;
    lastShot: number;
    fireRate: number;
    color: string;
    vx: number;
    vy: number;
    moveTimer: number;
    targetX: number;
    targetY: number;
}

interface Bullet {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    isLightning: boolean;
    vx: number;
    vy: number;
}

export default function AlienInvasionGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [audioInitialized, setAudioInitialized] = useState(false);
    const [showRestart, setShowRestart] = useState(false);
    const audioManager = AudioManager.getInstance();
    const touchControlsRef = useRef({
        left: false,
        right: false,
        shoot: false,
        super: false
    });
    
    // Mobile performance optimization
    const speedMultiplier = useRef(1);
    const lastFrameTime = useRef(Date.now());
    const gameRef = useRef({
        state: GameState.WALKING,
        stateTimer: 0,
        score: 0,
        aliensSeen: false,
        prepared: false,
        confrontationStarted: false,
        level: 1,
        baseAlienCount: 5,
        paused: false
    });
    
    const playerRef = useRef<Player>({
        x: 100,
        y: 550,
        width: 30,
        height: 50,
        speed: 3,
        direction: 1,
        health: 100,
        maxHealth: 100,
        damage: 10,
        fireRate: 500,
        lastShot: 0,
        color: '#4169E1',
        superAttackReady: false,
        superAttackCharging: false,
        superAttackTimer: 0,
        lastSuperAttack: 0,
        superCooldown: 10000
    });
    
    const homeRef = useRef({
        x: 50,
        y: 500,
        width: 80,
        height: 100,
        color: '#8B4513'
    });
    
    const aliensRef = useRef<Alien[]>([]);
    const bulletsRef = useRef<Bullet[]>([]);
    const alienBulletsRef = useRef<Bullet[]>([]);
    const keysRef = useRef<Record<string, boolean>>({});
    
    useEffect(() => {
        // Detect mobile device and adjust performance
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                                  ('ontouchstart' in window) || 
                                  (window.innerWidth <= 768);
            setIsMobile(isMobileDevice);
            
            // Increase speed multiplier for mobile devices to compensate for performance
            if (isMobileDevice) {
                speedMultiplier.current = 1.3; // 30% speed boost for mobile
            } else {
                speedMultiplier.current = 1.0;
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Initialize audio on first user interaction
        const initializeAudio = async () => {
            if (!audioInitialized) {
                await audioManager.initialize();
                setAudioInitialized(true);
            }
        };
        
        const handleFirstInteraction = () => {
            initializeAudio();
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        };
        
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Set fixed canvas resolution but scale with CSS
        canvas.width = 1000;
        canvas.height = 700;
        
        // Responsive canvas display sizing
        const resizeCanvas = () => {
            const padding = 32; // 16px each side
            const headerFooterSpace = isMobile ? 150 : 200; // Less space on mobile
            
            const maxWidth = Math.min(window.innerWidth - padding, 1000);
            const maxHeight = Math.min(window.innerHeight - headerFooterSpace, 700);
            const aspectRatio = 1000 / 700;
            
            let displayWidth, displayHeight;
            
            if (maxWidth / aspectRatio <= maxHeight) {
                displayWidth = maxWidth;
                displayHeight = maxWidth / aspectRatio;
            } else {
                displayWidth = maxHeight * aspectRatio;
                displayHeight = maxHeight;
            }
            
            // Use CSS to scale the canvas while maintaining game coordinates
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        class AlienClass implements Alien {
            x: number;
            y: number;
            width: number;
            height: number;
            speed: number;
            health: number;
            lastShot: number;
            fireRate: number;
            color: string;
            vx: number;
            vy: number;
            moveTimer: number;
            targetX: number;
            targetY: number;
            
            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                this.width = 40;
                this.height = 30;
                this.speed = 1 + Math.random() * 0.5;
                this.health = 30;
                this.lastShot = 0;
                this.fireRate = 2000;
                this.color = '#00FF00';
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.moveTimer = 0;
                this.targetX = x;
                this.targetY = y;
            }
            
            update() {
                const game = gameRef.current;
                
                if (game.state === GameState.SEEING_ALIENS) {
                    if (this.y < 550) {
                        this.y += 2 * speedMultiplier.current;
                    }
                } else if (game.state === GameState.CONFRONTING || game.state === GameState.FIGHTING) {
                    this.moveTimer++;
                    
                    if (this.moveTimer % 120 === 0) {
                        this.targetX = 50 + Math.random() * (1000 - 100); // Use fixed canvas width
                        this.targetY = 50 + Math.random() * (700 - 150);  // Use fixed canvas height
                    }
                    
                    const dx = this.targetX - this.x;
                    const dy = this.targetY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 5) {
                        this.vx = ((dx / dist) * this.speed + Math.sin(this.moveTimer * 0.05) * 0.5) * speedMultiplier.current;
                        this.vy = ((dy / dist) * this.speed + Math.cos(this.moveTimer * 0.05) * 0.5) * speedMultiplier.current;
                    }
                    
                    this.x += this.vx;
                    this.y += this.vy;
                    
                    if (this.x < 20) this.x = 20;
                    if (this.x > 1000 - 60) this.x = 1000 - 60; // Use fixed canvas width
                    if (this.y < 20) this.y = 20;
                    if (this.y > 700 - 100) this.y = 700 - 100; // Use fixed canvas height
                    
                    if (game.state === GameState.FIGHTING) {
                        if (Date.now() - this.lastShot > this.fireRate) {
                            this.shoot();
                            this.lastShot = Date.now();
                        }
                    }
                }
            }
            
            shoot() {
                const player = playerRef.current;
                const dx = (player.x + player.width / 2) - (this.x + 20);
                const dy = (player.y + player.height / 2) - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Play alien shoot sound
                audioManager.playSound('alienShoot', 0.3);
                
                alienBulletsRef.current.push({
                    x: this.x + 20,
                    y: this.y,
                    vx: (dx / distance) * 3 * speedMultiplier.current,
                    vy: (dy / distance) * 3 * speedMultiplier.current,
                    width: 4,
                    height: 8,
                    color: '#FF0000',
                    isLightning: false
                });
            }
            
            draw(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y + 15, 12, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#90EE90';
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.x + 24, this.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y + 2, 4, 1.2 * Math.PI, 1.8 * Math.PI);
                ctx.stroke();
                
                ctx.fillStyle = '#006400';
                ctx.beginPath();
                ctx.arc(this.x + 15, this.y + 25, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.x + 25, this.y + 25, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#90EE90';
                ctx.beginPath();
                ctx.arc(this.x + 7, this.y + 15, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.x + 33, this.y + 15, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        function spawnAliens() {
            const alienCount = gameRef.current.baseAlienCount + (gameRef.current.level - 1);
            for (let i = 0; i < alienCount; i++) {
                aliensRef.current.push(new AlienClass(500 + (i % 5) * 60, 50 + Math.floor(i / 5) * 50 + Math.random() * 30));
            }
        }
        
        function createBullet(x: number, y: number, targetX: number, targetY: number): Bullet {
            const dx = targetX - x;
            const dy = targetY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return {
                x,
                y,
                width: 4,
                height: 8,
                color: '#FFFF00',
                isLightning: gameRef.current.prepared,
                vx: (dx / distance) * 7 * speedMultiplier.current,
                vy: (dy / distance) * 7 * speedMultiplier.current
            };
        }
        
        function executeSuperAttack() {
            // Play mega blast sound
            audioManager.playSound('megaBlast', 0.6);
            
            aliensRef.current.forEach(alien => {
                const damage = 15 + Math.random() * 10;
                alien.health -= damage;
                alien.x += (Math.random() - 0.5) * 50;
                alien.y -= Math.random() * 30;
            });
            
            for (let i = aliensRef.current.length - 1; i >= 0; i--) {
                if (aliensRef.current[i].health <= 0) {
                    gameRef.current.score += 100;
                    aliensRef.current.splice(i, 1);
                }
            }
        }
        
        function checkCollision(obj1: { x: number; y: number; width: number; height: number }, obj2: { x: number; y: number; width: number; height: number }) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
        
        function updatePlayer() {
            const game = gameRef.current;
            const player = playerRef.current;
            const home = homeRef.current;
            const keys = keysRef.current;
            
            if (game.state === GameState.WALKING) {
                player.x += player.speed * player.direction * speedMultiplier.current;
                if (player.x > 1000 - 200) { // Use fixed canvas width
                    game.state = GameState.SEEING_ALIENS;
                    game.stateTimer = 0;
                    spawnAliens();
                }
            } else if (game.state === GameState.RUNNING_HOME) {
                if (player.x > home.x + home.width) {
                    player.x -= player.speed * 2 * speedMultiplier.current;
                } else {
                    game.state = GameState.PREPARING;
                    game.stateTimer = 0;
                }
            } else if (game.state === GameState.CONFRONTING) {
                if (player.x < 300) {
                    player.x += player.speed * speedMultiplier.current;
                } else if (!game.confrontationStarted) {
                    game.confrontationStarted = true;
                    game.stateTimer = 0;
                }
            } else if (game.state === GameState.FIGHTING) {
                // Handle movement (keyboard + touch)
                const touchControls = touchControlsRef.current;
                if ((keys.ArrowLeft || touchControls.left) && player.x > 0) {
                    player.x -= player.speed * speedMultiplier.current;
                }
                if ((keys.ArrowRight || touchControls.right) && player.x < 1000 - player.width) { // Use fixed canvas width
                    player.x += player.speed * speedMultiplier.current;
                }
                
                // Handle shooting (keyboard + touch)
                if ((keys.Space || touchControls.shoot) && Date.now() - player.lastShot > player.fireRate) {
                    let nearestAlien: Alien | null = null;
                    let minDistance = Infinity;
                    
                    aliensRef.current.forEach(alien => {
                        const dx = alien.x - player.x;
                        const dy = alien.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestAlien = alien;
                        }
                    });
                    
                    if (nearestAlien) {
                        // Play player shoot sound
                        audioManager.playSound('zap', 0.4);
                        
                        bulletsRef.current.push(createBullet(
                            player.x + player.width / 2 - 2,
                            player.y,
                            (nearestAlien as Alien).x + 20,
                            (nearestAlien as Alien).y + 15
                        ));
                        player.lastShot = Date.now();
                    }
                }
                
                if (Date.now() - player.lastSuperAttack > player.superCooldown && !player.superAttackReady) {
                    player.superAttackReady = true;
                }
                
                // Handle super attack (keyboard + touch)
                if ((keys.KeyM || touchControls.super) && player.superAttackReady && !player.superAttackCharging) {
                    player.superAttackCharging = true;
                    player.superAttackTimer = 0;
                }
                
                if (player.superAttackCharging) {
                    player.superAttackTimer++;
                    
                    if (player.superAttackTimer === 60) {
                        executeSuperAttack();
                        player.superAttackCharging = false;
                        player.superAttackReady = false;
                        player.lastSuperAttack = Date.now();
                    }
                }
            }
        }
        
        function updateBullets() {
            const player = playerRef.current;
            const game = gameRef.current;
            
            for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
                const bullet = bulletsRef.current[i];
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                
                if (bullet.y < 0 || bullet.y > 700 || // Use fixed canvas height
                    bullet.x < 0 || bullet.x > 1000) { // Use fixed canvas width
                    bulletsRef.current.splice(i, 1);
                    continue;
                }
                
                for (let j = aliensRef.current.length - 1; j >= 0; j--) {
                    if (checkCollision(bullet, aliensRef.current[j])) {
                        aliensRef.current[j].health -= player.damage;
                        bulletsRef.current.splice(i, 1);
                        
                        if (aliensRef.current[j].health <= 0) {
                            aliensRef.current.splice(j, 1);
                            game.score += 100;
                        }
                        break;
                    }
                }
            }
            
            for (let i = alienBulletsRef.current.length - 1; i >= 0; i--) {
                const bullet = alienBulletsRef.current[i];
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                
                if (bullet.y < 0 || bullet.y > 700 || // Use fixed canvas height
                    bullet.x < 0 || bullet.x > 1000) { // Use fixed canvas width
                    alienBulletsRef.current.splice(i, 1);
                    continue;
                }
                
                if (checkCollision(bullet, player)) {
                    player.health -= 5;
                    alienBulletsRef.current.splice(i, 1);
                    
                    if (player.health <= 0) {
                        // Play game over sound
                        audioManager.playSound('gameOver', 0.7);
                        game.state = GameState.GAME_OVER;
                        setShowRestart(true);
                    }
                }
            }
        }
        
        function updateGameState() {
            const game = gameRef.current;
            const player = playerRef.current;
            
            game.stateTimer++;
            
            switch(game.state) {
                case GameState.SEEING_ALIENS:
                    if (game.stateTimer > 120) {
                        game.state = GameState.RUNNING_HOME;
                        player.direction = -1;
                    }
                    break;
                    
                case GameState.PREPARING:
                    if (game.stateTimer > 180) {
                        game.state = GameState.CONFRONTING;
                        game.prepared = true;
                        player.color = '#FF4500';
                        player.damage = 20;
                        player.fireRate = 300;
                    }
                    break;
                    
                case GameState.CONFRONTING:
                    if (game.confrontationStarted && game.stateTimer > 120) {
                        game.state = GameState.FIGHTING;
                    }
                    break;
                    
                case GameState.FIGHTING:
                    if (aliensRef.current.length === 0) {
                        game.state = GameState.VICTORY;
                        game.stateTimer = 0;
                        setShowRestart(true);
                    }
                    break;
                    
                case GameState.VICTORY:
                    if (game.stateTimer > 180) {
                        game.level++;
                        game.state = GameState.WALKING;
                        game.stateTimer = 0;
                        game.aliensSeen = false;
                        game.prepared = false;
                        game.confrontationStarted = false;
                        
                        player.x = 100;
                        player.y = 550;
                        player.direction = 1;
                        player.health = player.maxHealth;
                        
                        bulletsRef.current.length = 0;
                        alienBulletsRef.current.length = 0;
                    }
                    break;
            }
        }
        
        function drawPlayer(ctx: CanvasRenderingContext2D) {
            const player = playerRef.current;
            
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.arc(player.x + 15, player.y + 25, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFE4B5';
            ctx.beginPath();
            ctx.arc(player.x + 15, player.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(player.x + 11, player.y + 8, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(player.x + 19, player.y + 8, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(player.x + 15, player.y + 10, 4, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();
            
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(player.x + 10, player.y + 42, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(player.x + 20, player.y + 42, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFE4B5';
            ctx.beginPath();
            ctx.arc(player.x + 2, player.y + 25, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(player.x + 28, player.y + 25, 4, 0, Math.PI * 2);
            ctx.fill();
            
            if (gameRef.current.prepared) {
                ctx.save();
                ctx.translate(player.x + 32, player.y + 25);
                
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(0, -2, 8, 4);
                
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(15, -3);
                ctx.lineTo(20, 2);
                ctx.lineTo(25, -4);
                ctx.lineTo(30, 1);
                ctx.lineTo(38, -2);
                ctx.stroke();
                
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(15, -3);
                ctx.lineTo(20, 2);
                ctx.lineTo(25, -4);
                ctx.lineTo(30, 1);
                ctx.lineTo(38, -2);
                ctx.stroke();
                
                if (Math.random() > 0.7) {
                    ctx.strokeStyle = '#FFFF00';
                    ctx.lineWidth = 1;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#FFFF00';
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(38, -2);
                        ctx.lineTo(42 + Math.random() * 5, -5 + Math.random() * 10);
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
        }
        
        function drawHome(ctx: CanvasRenderingContext2D) {
            const home = homeRef.current;
            
            ctx.fillStyle = home.color;
            ctx.fillRect(home.x, home.y, home.width, home.height);
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(home.x + 20, home.y + 20, 20, 30);
            ctx.fillRect(home.x + 50, home.y + 20, 20, 20);
            
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.moveTo(home.x - 10, home.y);
            ctx.lineTo(home.x + home.width / 2, home.y - 30);
            ctx.lineTo(home.x + home.width + 10, home.y);
            ctx.closePath();
            ctx.fill();
        }
        
        function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
            if (bullet.isLightning) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(bullet.x, bullet.y);
                ctx.lineTo(bullet.x + 2, bullet.y - 5);
                ctx.lineTo(bullet.x - 2, bullet.y - 10);
                ctx.lineTo(bullet.x + 3, bullet.y - 15);
                ctx.lineTo(bullet.x - 1, bullet.y - 20);
                ctx.stroke();
                
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(bullet.x, bullet.y);
                ctx.lineTo(bullet.x + 2, bullet.y - 5);
                ctx.lineTo(bullet.x - 2, bullet.y - 10);
                ctx.lineTo(bullet.x + 3, bullet.y - 15);
                ctx.lineTo(bullet.x - 1, bullet.y - 20);
                ctx.stroke();
            } else {
                ctx.fillStyle = bullet.color;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }
        }
        
        function drawUI(ctx: CanvasRenderingContext2D) {
            const game = gameRef.current;
            const player = playerRef.current;
            
            // Reset text properties to default for UI elements
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFF';
            ctx.font = '20px Arial';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            
            ctx.fillText('Level: ' + game.level, 10, 30);
            ctx.fillText('Score: ' + game.score, 120, 30);
            
            if (game.state === GameState.FIGHTING && game.prepared) {
                const cooldownPercent = Math.min(1, (Date.now() - player.lastSuperAttack) / player.superCooldown);
                
                ctx.fillStyle = '#333';
                ctx.fillRect(250, 15, 150, 20);
                
                if (player.superAttackReady) {
                    ctx.fillStyle = '#00FFFF';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#00FFFF';
                } else {
                    ctx.fillStyle = '#0088CC';
                    ctx.shadowBlur = 0;
                }
                ctx.fillRect(250, 15, 150 * cooldownPercent, 20);
                
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                ctx.strokeRect(250, 15, 150, 20);
                
                ctx.fillStyle = '#FFF';
                ctx.font = '14px Arial';
                if (player.superAttackReady) {
                    ctx.fillText('SUPER READY! (M)', 255, 30);
                } else {
                    ctx.fillText('Super: ' + Math.ceil((1 - cooldownPercent) * 10) + 's', 255, 30);
                }
            }
            
            if (game.state === GameState.FIGHTING) {
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(10, 50, 200, 20);
                ctx.fillStyle = '#00FF00';
                ctx.fillRect(10, 50, (player.health / player.maxHealth) * 200, 20);
                ctx.strokeStyle = '#FFF';
                ctx.strokeRect(10, 50, 200, 20);
                
                ctx.fillStyle = '#FFF';
                ctx.font = '14px Arial';
                ctx.fillText('Health: ' + player.health, 15, 65);
            }
            
            ctx.fillStyle = '#FFF';
            ctx.font = '16px Arial';
            
            switch(game.state) {
                case GameState.WALKING:
                    ctx.fillText('Walking peacefully...', 500 - 80, 50);
                    break;
                case GameState.SEEING_ALIENS:
                    ctx.fillStyle = '#FF0000';
                    ctx.font = '24px Arial';
                    ctx.fillText('ALIEN SHIPS!!!', 500 - 80, 100);
                    break;
                case GameState.RUNNING_HOME:
                    ctx.fillText('Running home to prepare!', 500 - 100, 50);
                    break;
                case GameState.PREPARING:
                    ctx.fillText('Getting ready to fight...', 500 - 100, 50);
                    break;
                case GameState.CONFRONTING:
                    if (game.confrontationStarted) {
                        ctx.fillStyle = '#FFD700';
                        ctx.font = '20px Arial';
                        ctx.fillText('"Hey, come here, I\'m going to fight you!"', 500 - 180, 100);
                    }
                    break;
                case GameState.GAME_OVER:
                    // Retro 80s arcade game over screen
                    const centerX = 500;
                    const centerY = 350;
                    const time = Date.now() / 1000;
                    
                    // Dark overlay with grid pattern
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.fillRect(0, 0, 1000, 700);
                    
                    // Retro grid background
                    ctx.strokeStyle = '#FF00FF';
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.3;
                    
                    // Horizontal grid lines
                    for (let y = 0; y < 700; y += 30) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(1000, y);
                        ctx.stroke();
                    }
                    
                    // Vertical grid lines
                    for (let x = 0; x < 1000; x += 40) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, 700);
                        ctx.stroke();
                    }
                    
                    ctx.globalAlpha = 1;
                    
                    // Main "GAME OVER" title with neon glow
                    ctx.save();
                    
                    // Outer glow
                    ctx.shadowColor = '#FF0080';
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = '#FF0080';
                    ctx.font = 'bold 60px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER', centerX, centerY - 60);
                    
                    // Inner glow
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#FF40A0';
                    ctx.fillText('GAME OVER', centerX, centerY - 60);
                    
                    // Core text
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText('GAME OVER', centerX, centerY - 60);
                    
                    ctx.restore();
                    
                    // Animated "INSERT COIN TO CONTINUE" text
                    const blinkSpeed = Math.sin(time * 4) > 0 ? 1 : 0.3;
                    ctx.globalAlpha = blinkSpeed;
                    
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#00FFFF';
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('INSERT COIN TO CONTINUE', centerX, centerY + 20);
                    
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#80FFFF';
                    ctx.fillText('INSERT COIN TO CONTINUE', centerX, centerY + 20);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText('INSERT COIN TO CONTINUE', centerX, centerY + 20);
                    
                    ctx.globalAlpha = 1;
                    
                    // Score display with retro styling
                    ctx.shadowColor = '#FFFF00';
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#FFFF00';
                    ctx.font = 'bold 28px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`FINAL SCORE: ${game.score}`, centerX, centerY + 80);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`FINAL SCORE: ${game.score}`, centerX, centerY + 80);
                    
                    // High score display (placeholder for now)
                    const storedHighScore = localStorage.getItem('alienInvasionHighScore') || '0';
                    const highScore = Math.max(parseInt(storedHighScore), game.score);
                    if (game.score >= parseInt(storedHighScore)) {
                        localStorage.setItem('alienInvasionHighScore', game.score.toString());
                    }
                    
                    ctx.shadowColor = '#FF8000';
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#FF8000';
                    ctx.font = 'bold 20px monospace';
                    ctx.fillText(`HIGH SCORE: ${highScore}`, centerX, centerY + 120);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`HIGH SCORE: ${highScore}`, centerX, centerY + 120);
                    
                    // Controls instruction
                    ctx.shadowColor = '#00FF00';
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#00FF00';
                    ctx.font = 'bold 18px monospace';
                    ctx.fillText('PRESS R TO RESTART', centerX, centerY + 160);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText('PRESS R TO RESTART', centerX, centerY + 160);
                    
                    // Retro border frame
                    ctx.strokeStyle = '#FF00FF';
                    ctx.lineWidth = 4;
                    ctx.shadowColor = '#FF00FF';
                    ctx.shadowBlur = 15;
                    ctx.strokeRect(20, 20, 1000 - 40, 700 - 40);
                    
                    // Corner decorations
                    const cornerSize = 30;
                    ctx.strokeStyle = '#00FFFF';
                    ctx.lineWidth = 3;
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 10;
                    
                    // Top-left corner
                    ctx.beginPath();
                    ctx.moveTo(20, 20 + cornerSize);
                    ctx.lineTo(20, 20);
                    ctx.lineTo(20 + cornerSize, 20);
                    ctx.stroke();
                    
                    // Top-right corner
                    ctx.beginPath();
                    ctx.moveTo(1000 - 20 - cornerSize, 20);
                    ctx.lineTo(1000 - 20, 20);
                    ctx.lineTo(1000 - 20, 20 + cornerSize);
                    ctx.stroke();
                    
                    // Bottom-left corner
                    ctx.beginPath();
                    ctx.moveTo(20, 700 - 20 - cornerSize);
                    ctx.lineTo(20, 700 - 20);
                    ctx.lineTo(20 + cornerSize, 700 - 20);
                    ctx.stroke();
                    
                    // Bottom-right corner
                    ctx.beginPath();
                    ctx.moveTo(1000 - 20 - cornerSize, 700 - 20);
                    ctx.lineTo(1000 - 20, 700 - 20);
                    ctx.lineTo(1000 - 20, 700 - 20 - cornerSize);
                    ctx.stroke();
                    
                    // Reset shadow properties and text alignment
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                    ctx.textAlign = 'left';
                    break;
                case GameState.VICTORY:
                    // Retro 80s victory screen
                    const vCenterX = 500;
                    const vCenterY = 350;
                    const vTime = Date.now() / 1000;
                    
                    // Victory glow background
                    ctx.fillStyle = 'rgba(0, 50, 0, 0.8)';
                    ctx.fillRect(0, 0, 1000, 700);
                    
                    // Animated success grid
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.3 + Math.sin(vTime * 2) * 0.2;
                    
                    for (let i = 0; i < 5; i++) {
                        ctx.strokeRect(
                            vCenterX - 200 + i * 10,
                            vCenterY - 150 + i * 10,
                            400 - i * 20,
                            300 - i * 20
                        );
                    }
                    ctx.globalAlpha = 1;
                    
                    // "LEVEL COMPLETE" with neon effect
                    ctx.shadowColor = '#00FF00';
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = '#00FF00';
                    ctx.font = 'bold 48px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`LEVEL ${game.level} COMPLETE!`, vCenterX, vCenterY - 80);
                    
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#80FF80';
                    ctx.fillText(`LEVEL ${game.level} COMPLETE!`, vCenterX, vCenterY - 80);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`LEVEL ${game.level} COMPLETE!`, vCenterX, vCenterY - 80);
                    
                    // Score with golden glow
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 32px monospace';
                    ctx.fillText(`SCORE: ${game.score}`, vCenterX, vCenterY - 20);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`SCORE: ${game.score}`, vCenterX, vCenterY - 20);
                    
                    // Next level with pulsing effect
                    const pulse = 0.8 + Math.sin(vTime * 3) * 0.3;
                    ctx.globalAlpha = pulse;
                    ctx.shadowColor = '#FF8000';
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = '#FF8000';
                    ctx.font = 'bold 28px monospace';
                    ctx.fillText(`NEXT: LEVEL ${game.level + 1}`, vCenterX, vCenterY + 40);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`NEXT: LEVEL ${game.level + 1}`, vCenterX, vCenterY + 40);
                    ctx.globalAlpha = 1;
                    
                    // Countdown timer
                    const countdown = Math.ceil((180 - game.stateTimer) / 60);
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#00FFFF';
                    ctx.font = 'bold 24px monospace';
                    ctx.fillText(`STARTING IN ${countdown}...`, vCenterX, vCenterY + 100);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`STARTING IN ${countdown}...`, vCenterX, vCenterY + 100);
                    
                    // Reset effects and text alignment
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                    ctx.textAlign = 'left';
                    break;
            }
        }
        
        function draw() {
            if (!ctx) return;
            
            const game = gameRef.current;
            const player = playerRef.current;
            
            ctx.fillStyle = '#000033';
            ctx.fillRect(0, 0, 1000, 700);
            
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 50; i++) {
                const x = (i * 73) % 1000;
                const y = (i * 37) % 400;
                const size = (i % 3) + 1;
                ctx.fillRect(x, y, size, size);
            }
            
            if (player.superAttackCharging) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 5 + Math.random() * 3;
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#00FFFF';
                
                ctx.beginPath();
                ctx.moveTo(player.x + 35, 0);
                
                for (let y = 0; y < player.y + 25; y += 40) {
                    ctx.lineTo(player.x + 35 + (Math.random() - 0.5) * 20, y);
                }
                ctx.lineTo(player.x + 35, player.y + 25);
                ctx.stroke();
                
                for (let i = 0; i < 3; i++) {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(player.x + 35 + (Math.random() - 0.5) * 30, Math.random() * 200);
                    ctx.lineTo(player.x + 35, player.y + 25);
                    ctx.stroke();
                }
                
                ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(player.superAttackTimer * 0.2) * 0.2})`;
                ctx.beginPath();
                ctx.arc(player.x + 15, player.y + 25, 40 + player.superAttackTimer / 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (player.superAttackTimer > 55 && player.superAttackTimer <= 65) {
                aliensRef.current.forEach(alien => {
                    ctx.strokeStyle = '#FFFF00';
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#FFFF00';
                    ctx.beginPath();
                    ctx.moveTo(alien.x + 20, 0);
                    
                    for (let y = 0; y < alien.y; y += 30) {
                        ctx.lineTo(alien.x + 20 + (Math.random() - 0.5) * 10, y);
                    }
                    ctx.lineTo(alien.x + 20, alien.y);
                    ctx.stroke();
                });
                
                ctx.fillStyle = `rgba(255, 255, 255, ${0.5 - (player.superAttackTimer - 55) * 0.05})`;
                ctx.fillRect(0, 0, 1000, 700);
            }
            
            const groundY = 600;
            
            ctx.fillStyle = '#1F4F2F';
            ctx.fillRect(0, groundY, 1000, 100);
            
            for (let i = 0; i < 15; i++) {
                const centerX = (i * 137) % 1000;
                const centerY = groundY + 30 + (i * 47) % 50;
                const maxRadius = 25 + (i * 13) % 20;
                
                for (let r = maxRadius; r > 0; r -= 3) {
                    const isGreen = (i + Math.floor(r / 10)) % 2 === 0;
                    const opacity = 0.3 + (r / maxRadius) * 0.4;
                    
                    if (isGreen) {
                        ctx.fillStyle = `rgba(34, 139, 34, ${opacity})`;
                    } else {
                        ctx.fillStyle = `rgba(30, 144, 255, ${opacity})`;
                    }
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            for (let i = 0; i < 20; i++) {
                const x = (i * 89) % 1000;
                const y = groundY + 20 + (i * 31) % 60;
                const radius = 15 + (i * 11) % 15;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                if (i % 2 === 0) {
                    gradient.addColorStop(0, 'rgba(0, 255, 127, 0.5)');
                    gradient.addColorStop(0.5, 'rgba(30, 144, 255, 0.3)');
                    gradient.addColorStop(1, 'rgba(0, 100, 200, 0.1)');
                } else {
                    gradient.addColorStop(0, 'rgba(30, 144, 255, 0.5)');
                    gradient.addColorStop(0.5, 'rgba(0, 255, 127, 0.3)');
                    gradient.addColorStop(1, 'rgba(34, 139, 34, 0.1)');
                }
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            drawHome(ctx);
            drawPlayer(ctx);
            
            aliensRef.current.forEach(alien => (alien as AlienClass).draw(ctx));
            bulletsRef.current.forEach(bullet => drawBullet(ctx, bullet));
            
            alienBulletsRef.current.forEach(bullet => {
                ctx.fillStyle = bullet.color;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            });
            
            drawUI(ctx);
            
            if (game.paused) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, 1000, 700);
                
                ctx.fillStyle = '#FFD700';
                ctx.font = '48px Arial';
                ctx.fillText('PAUSED', 500 - 90, 350);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText('Press P to resume', 500 - 80, 350 + 40);
            }
        }
        
        function gameLoop() {
            const currentTime = Date.now();
            const deltaTime = currentTime - lastFrameTime.current;
            lastFrameTime.current = currentTime;
            
            // Adjust speed multiplier based on frame rate
            const targetFrameTime = 16.67; // 60 FPS
            const frameRateMultiplier = Math.min(deltaTime / targetFrameTime, 2.0); // Cap at 2x
            
            // Apply frame rate compensation
            const currentSpeedMultiplier = isMobile 
                ? speedMultiplier.current * Math.max(1.0, frameRateMultiplier)
                : speedMultiplier.current * frameRateMultiplier;
            
            // Temporarily update speed multiplier for this frame
            const originalSpeedMultiplier = speedMultiplier.current;
            speedMultiplier.current = currentSpeedMultiplier;
            
            const game = gameRef.current;
            
            if (!game.paused && game.state !== GameState.GAME_OVER) {
                updateGameState();
                if (game.state !== GameState.VICTORY) {
                    updatePlayer();
                    aliensRef.current.forEach(alien => (alien as AlienClass).update());
                    updateBullets();
                }
            }
            
            draw();
            
            // Restore original speed multiplier
            speedMultiplier.current = originalSpeedMultiplier;
            
            requestAnimationFrame(gameLoop);
        }
        
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.code] = true;
            
            if (e.code === 'KeyP') {
                gameRef.current.paused = !gameRef.current.paused;
            }
            
            if (e.code === 'KeyR' && (gameRef.current.state === GameState.GAME_OVER || gameRef.current.state === GameState.VICTORY)) {
                resetGame();
            }
        };
        
        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.code] = false;
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        gameLoop();
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('resize', resizeCanvas);
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        };
    }, [audioInitialized, audioManager, isMobile]);
    
    const handleTouchStart = (control: keyof typeof touchControlsRef.current) => {
        touchControlsRef.current[control] = true;
    };
    
    const handleTouchEnd = (control: keyof typeof touchControlsRef.current) => {
        touchControlsRef.current[control] = false;
    };
    
    const resetGame = () => {
        const game = gameRef.current;
        const player = playerRef.current;
        
        game.state = GameState.WALKING;
        game.stateTimer = 0;
        game.score = 0;
        game.aliensSeen = false;
        game.prepared = false;
        game.confrontationStarted = false;
        game.level = 1;
        
        player.x = 100;
        player.y = 550;
        player.direction = 1;
        player.health = player.maxHealth;
        
        setShowRestart(false);
        player.color = '#4169E1';
        player.damage = 10;
        player.fireRate = 500;
        
        player.superAttackReady = false;
        player.superAttackCharging = false;
        player.superAttackTimer = 0;
        player.lastSuperAttack = 0;
        player.superCooldown = 0;
        
        aliensRef.current = [];
        alienBulletsRef.current = [];
        bulletsRef.current = [];
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-2 sm:p-4">
            <PWAInstaller />
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">Alien Invasion</h1>
            
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    className="border-2 border-gray-600 rounded-lg shadow-2xl block mx-auto"
                    style={{ 
                        touchAction: 'none',
                        imageRendering: 'pixelated'
                    }}
                />
                
                {/* Audio status indicator */}
                {!audioInitialized && (
                    <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                        Tap to enable audio
                    </div>
                )}
            </div>
            
            {/* Mobile Controls */}
            {isMobile && (
                <div className="fixed bottom-4 left-0 right-0 flex justify-between items-end px-4 pointer-events-none z-10">
                    {/* Left side controls */}
                    <div className="flex space-x-2 pointer-events-auto">
                        <button
                            onTouchStart={() => handleTouchStart('left')}
                            onTouchEnd={() => handleTouchEnd('left')}
                            onMouseDown={() => handleTouchStart('left')}
                            onMouseUp={() => handleTouchEnd('left')}
                            onMouseLeave={() => handleTouchEnd('left')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-16 h-16 rounded-full shadow-lg active:scale-95 transition-transform select-none"
                            style={{ touchAction: 'manipulation' }}
                        >
                            ←
                        </button>
                        <button
                            onTouchStart={() => handleTouchStart('right')}
                            onTouchEnd={() => handleTouchEnd('right')}
                            onMouseDown={() => handleTouchStart('right')}
                            onMouseUp={() => handleTouchEnd('right')}
                            onMouseLeave={() => handleTouchEnd('right')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-16 h-16 rounded-full shadow-lg active:scale-95 transition-transform select-none"
                            style={{ touchAction: 'manipulation' }}
                        >
                            →
                        </button>
                    </div>
                    
                    {/* Right side controls */}
                    <div className="flex flex-col space-y-2 pointer-events-auto">
                        {showRestart && (
                            <button
                                onClick={resetGame}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold w-16 h-16 rounded-full shadow-lg active:scale-95 transition-transform select-none"
                                style={{ touchAction: 'manipulation' }}
                            >
                                🔄
                            </button>
                        )}
                        <button
                            onTouchStart={() => handleTouchStart('super')}
                            onTouchEnd={() => handleTouchEnd('super')}
                            onMouseDown={() => handleTouchStart('super')}
                            onMouseUp={() => handleTouchEnd('super')}
                            onMouseLeave={() => handleTouchEnd('super')}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-16 h-16 rounded-full shadow-lg active:scale-95 transition-transform select-none text-sm"
                            style={{ touchAction: 'manipulation' }}
                        >
                            ⚡
                        </button>
                        <button
                            onTouchStart={() => handleTouchStart('shoot')}
                            onTouchEnd={() => handleTouchEnd('shoot')}
                            onMouseDown={() => handleTouchStart('shoot')}
                            onMouseUp={() => handleTouchEnd('shoot')}
                            onMouseLeave={() => handleTouchEnd('shoot')}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold w-16 h-16 rounded-full shadow-lg active:scale-95 transition-transform select-none"
                            style={{ touchAction: 'manipulation' }}
                        >
                            🔥
                        </button>
                    </div>
                </div>
            )}
            
            <div className="mt-2 sm:mt-4 text-white text-center px-2">
                <p className="mb-1 sm:mb-2 text-sm sm:text-base">Controls:</p>
                {isMobile ? (
                    <p className="text-xs sm:text-sm">Use touch buttons below | P: Pause | R: Restart</p>
                ) : (
                    <p className="text-xs sm:text-sm">Arrow Keys: Move | Space: Shoot | M: Super Attack | P: Pause | R: Restart</p>
                )}
                {audioInitialized && (
                    <p className="text-xs text-green-400 mt-1">Audio enabled ✓</p>
                )}
            </div>
        </div>
    );
}