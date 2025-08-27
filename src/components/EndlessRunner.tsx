import React, { useEffect, useRef } from 'react';

const EndlessRunner: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{
    scene?: any;
    camera?: any;
    renderer?: any;
    animationId?: number;
  }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // Load Three.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      initGame();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
      if (gameRef.current.renderer && mountRef.current) {
        mountRef.current.removeChild(gameRef.current.renderer.domElement);
      }
      document.head.removeChild(script);
    };
  }, []);

  const initGame = () => {
    if (!mountRef.current || !window.THREE) return;

    const THREE = window.THREE;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    mountRef.current.appendChild(renderer.domElement);

    gameRef.current = { scene, camera, renderer };

    // Dark lighting with flashlight
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    const flashlight = new THREE.SpotLight(0xffffff, 1, 50, Math.PI / 4, 0.5, 2);
    flashlight.position.set(0, 5, 0);
    flashlight.target.position.set(0, 0, -20);
    scene.add(flashlight);
    scene.add(flashlight.target);

    // Ground (track)
    const groundGeometry = new THREE.PlaneGeometry(10, 1000);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -500;
    scene.add(ground);

    // Player (simple capsule)
    const playerBodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
    const playerBodyMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const player = new THREE.Mesh(playerBodyGeometry, playerBodyMaterial);
    player.position.set(0, 0.75, 0);
    scene.add(player);

    // Chaser: Job Application
    const chaserGeometry = new THREE.PlaneGeometry(3, 4);
    const chaserMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const chaser = new THREE.Mesh(chaserGeometry, chaserMaterial);
    chaser.position.set(0, 2, 20);
    chaser.rotation.y = Math.PI;
    scene.add(chaser);

    // Game variables
    const lanes = [-2, 0, 2];
    let currentLane = 1;
    player.position.x = lanes[currentLane];

    let isJumping = false;
    let jumpVelocity = 0;
    const jumpHeight = 0.3;
    const gravity = 0.01;
    let isSliding = false;
    let slideTimer = 0;
    const slideDuration = 30;

    let playerSpeed = 0.5;
    const baseSpeed = 0.5;
    let chaserSpeed = 0.4;
    let score = 0;
    let gameOver = false;

    const obstacles: any[] = [];
    const coins: any[] = [];
    const obstacleSpawnInterval = 100;
    let frameCount = 0;

    // Spawn obstacle function
    function spawnObstacle() {
      const type = Math.random() > 0.5 ? 'low' : 'high';
      const lane = Math.floor(Math.random() * 3);
      const obsGeometry = new THREE.BoxGeometry(1, type === 'low' ? 1 : 3, 1);
      const obsMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const obs = new THREE.Mesh(obsGeometry, obsMaterial);
      obs.position.set(lanes[lane], type === 'low' ? 0.5 : 1.5, player.position.z - 50 - Math.random() * 20);
      obs.userData = { type, lane };
      scene.add(obs);
      obstacles.push(obs);
    }

    // Spawn coin function
    function spawnCoin() {
      const lane = Math.floor(Math.random() * 3);
      const coinGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const coinMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(lanes[lane], 1, player.position.z - 40 - Math.random() * 30);
      scene.add(coin);
      coins.push(coin);
    }

    // Controls
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => keys[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys[e.key] = false;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > swipeThreshold && currentLane < 2) {
          currentLane++;
          player.position.x = lanes[currentLane];
        } else if (deltaX < -swipeThreshold && currentLane > 0) {
          currentLane--;
          player.position.x = lanes[currentLane];
        }
      } else {
        if (deltaY < -swipeThreshold && !isJumping) {
          isJumping = true;
          jumpVelocity = jumpHeight;
        } else if (deltaY > swipeThreshold && !isSliding && !isJumping) {
          isSliding = true;
          slideTimer = slideDuration;
          player.scale.y = 0.5;
          player.position.y = 0.375;
        }
      }
    };

    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchend', handleTouchEnd);

    // Animation loop
    function animate() {
      if (gameOver) return;

      gameRef.current.animationId = requestAnimationFrame(animate);
      frameCount++;

      // Auto move forward
      player.position.z -= playerSpeed;
      chaser.position.z -= chaserSpeed;

      // Update score
      score += 0.1;
      const scoreElement = document.getElementById('runner-score');
      if (scoreElement) {
        scoreElement.textContent = `Score: ${Math.floor(score)}`;
      }

      // Keyboard controls
      if ((keys['ArrowLeft'] || keys['a']) && currentLane > 0) {
        currentLane--;
        player.position.x = lanes[currentLane];
        keys['ArrowLeft'] = keys['a'] = false;
      }
      if ((keys['ArrowRight'] || keys['d']) && currentLane < 2) {
        currentLane++;
        player.position.x = lanes[currentLane];
        keys['ArrowRight'] = keys['d'] = false;
      }
      if ((keys['ArrowUp'] || keys['w']) && !isJumping) {
        isJumping = true;
        jumpVelocity = jumpHeight;
        keys['ArrowUp'] = keys['w'] = false;
      }
      if ((keys['ArrowDown'] || keys['s']) && !isSliding && !isJumping) {
        isSliding = true;
        slideTimer = slideDuration;
        player.scale.y = 0.5;
        player.position.y = 0.375;
        keys['ArrowDown'] = keys['s'] = false;
      }

      // Jump physics
      if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= gravity;
        if (player.position.y <= 0.75) {
          player.position.y = 0.75;
          isJumping = false;
        }
      }

      // Slide physics
      if (isSliding) {
        slideTimer--;
        if (slideTimer <= 0) {
          isSliding = false;
          player.scale.y = 1;
          player.position.y = 0.75;
        }
      }

      // Spawn obstacles and coins
      if (frameCount % obstacleSpawnInterval === 0) {
        spawnObstacle();
        if (Math.random() > 0.3) spawnCoin();
      }

      // Update camera and flashlight
      camera.position.set(player.position.x, player.position.y + 3, player.position.z + 5);
      camera.lookAt(player.position.x, player.position.y, player.position.z - 10);
      flashlight.position.copy(camera.position);
      flashlight.target.position.set(player.position.x, player.position.y, player.position.z - 20);

      // Update chaser
      chaser.position.x = player.position.x;
      chaser.lookAt(player.position);

      // Check collisions with obstacles
      obstacles.forEach((obs, i) => {
        const distZ = Math.abs(player.position.z - obs.position.z);
        const sameLane = currentLane === obs.userData.lane;
        if (distZ < 1 && sameLane) {
          if (obs.userData.type === 'low' && player.position.y > 1.5) {
            // Jumped over
          } else if (obs.userData.type === 'high' && isSliding) {
            // Slid under
          } else {
            // Collision
            playerSpeed = 0.1;
            setTimeout(() => { playerSpeed = baseSpeed; }, 1000);
          }
        }
        if (obs.position.z > player.position.z + 10) {
          scene.remove(obs);
          obstacles.splice(i, 1);
        }
      });

      // Check coin collection
      coins.forEach((coin, i) => {
        if (Math.abs(player.position.x - coin.position.x) < 1 && 
            Math.abs(player.position.z - coin.position.z) < 1 && 
            Math.abs(player.position.y - coin.position.y) < 1) {
          scene.remove(coin);
          coins.splice(i, 1);
          score += 10;
        }
        if (coin.position.z > player.position.z + 10) {
          scene.remove(coin);
          coins.splice(i, 1);
        }
      });

      // Check if chaser catches up
      if (chaser.position.z >= player.position.z - 2) {
        gameOver = true;
        const gameOverElement = document.getElementById('runner-game-over');
        if (gameOverElement) {
          gameOverElement.style.display = 'block';
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
    };
  };

  return (
    <div className="relative">
      <div id="runner-score" className="absolute top-2 left-2 text-white font-mono text-lg z-10">
        Score: 0
      </div>
      <div 
        id="runner-game-over" 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 font-mono text-2xl z-10 hidden text-center"
      >
        Game Over!<br />This job application is too scary.
      </div>
      <div 
        ref={mountRef} 
        className="w-full h-96 bg-black border border-white flex items-center justify-center"
      >
        <div className="text-white font-mono">Loading game...</div>
      </div>
      <div className="mt-4 text-white font-mono text-sm">
        <p className="mb-2">Controls:</p>
        <p>Desktop: Arrow keys or WASD</p>
        <p>Mobile: Swipe left/right to move, up to jump, down to slide</p>
      </div>
    </div>
  );
};

export default EndlessRunner;