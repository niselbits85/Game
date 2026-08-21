import Phaser from 'phaser';

const WIDTH = 800;
const HEIGHT = 600;
const PLAYER_SPEED = 220;
const BULLET_SPEED = 500;
const FIRE_COOLDOWN = 220;
const ENEMY_SPEED = 90;
const ENEMY_SPAWN_INTERVAL = 900;
const PLAYER_MAX_HEALTH = 100;
const ENEMY_CONTACT_DAMAGE = 20;
const ENEMY_CONTACT_COOLDOWN = 500;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  preload() {
    this.makeTriangleTexture('player', 0x4fd1ff, 24);
    this.makeCircleTexture('enemy', 0xe86a6a, 16);
    this.makeCircleTexture('bullet', 0xffe066, 5);
  }

  create() {
    this.health = PLAYER_MAX_HEALTH;
    this.score = 0;
    this.lastFired = 0;
    this.gameOver = false;

    this.player = this.physics.add.sprite(WIDTH / 2, HEIGHT / 2, 'player');
    this.player.setDamping(true);
    this.player.setDrag(0.85);
    this.player.setMaxVelocity(PLAYER_SPEED);
    this.player.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.input.on('pointerdown', () => this.fireAtPointer());

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);

    this.scoreText = this.add.text(12, 10, 'Score: 0', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' });
    this.healthText = this.add.text(12, 32, `Health: ${this.health}`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' });
    this.hintText = this.add.text(WIDTH / 2, HEIGHT - 20, 'WASD/Arrows to move, click or Space to shoot', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5, 1);

    this.time.addEvent({ delay: ENEMY_SPAWN_INTERVAL, loop: true, callback: () => this.spawnEnemy() });
  }

  update(time) {
    if (this.gameOver) return;

    this.handleMovement();

    if (this.keys.SPACE.isDown) {
      this.fireForward(time);
    }

    this.enemies.getChildren().forEach((enemy) => {
      this.physics.moveToObject(enemy, this.player, ENEMY_SPEED);
    });

    this.bullets.getChildren().forEach((bullet) => {
      if (bullet.x < -20 || bullet.x > WIDTH + 20 || bullet.y < -20 || bullet.y > HEIGHT + 20) {
        bullet.destroy();
      }
    });
  }

  handleMovement() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    const accel = 900;
    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);
    this.player.setAcceleration(ax * accel, ay * accel);

    if (ax !== 0 || ay !== 0) {
      this.player.rotation = Math.atan2(ay, ax) + Math.PI / 2;
    }
  }

  fireForward(time) {
    if (time < this.lastFired + FIRE_COOLDOWN) return;
    this.lastFired = time;
    const angle = this.player.rotation - Math.PI / 2;
    this.spawnBullet(angle);
  }

  fireAtPointer() {
    if (this.gameOver) return;
    const time = this.time.now;
    if (time < this.lastFired + FIRE_COOLDOWN) return;
    this.lastFired = time;
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
    this.player.rotation = angle + Math.PI / 2;
    this.spawnBullet(angle);
  }

  spawnBullet(angle) {
    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
    bullet.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
  }

  spawnEnemy() {
    if (this.gameOver) return;
    const edge = Phaser.Math.Between(0, 3);
    let x; let y;
    if (edge === 0) { x = Phaser.Math.Between(0, WIDTH); y = -20; }
    else if (edge === 1) { x = WIDTH + 20; y = Phaser.Math.Between(0, HEIGHT); }
    else if (edge === 2) { x = Phaser.Math.Between(0, WIDTH); y = HEIGHT + 20; }
    else { x = -20; y = Phaser.Math.Between(0, HEIGHT); }

    const enemy = this.enemies.create(x, y, 'enemy');
    enemy.lastHitAt = 0;
  }

  onBulletHitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  onPlayerHitEnemy(player, enemy) {
    const now = this.time.now;
    if (now < (enemy.lastHitAt || 0) + ENEMY_CONTACT_COOLDOWN) return;
    enemy.lastHitAt = now;
    this.health = Math.max(0, this.health - ENEMY_CONTACT_DAMAGE);
    this.healthText.setText(`Health: ${this.health}`);
    if (this.health <= 0) this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.player.setTint(0x555555);
    this.add.text(WIDTH / 2, HEIGHT / 2, `Game Over\nScore: ${this.score}\nClick to restart`, {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.restart());
  }

  makeTriangleTexture(key, color, size) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillTriangle(size / 2, 0, size, size, 0, size);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeCircleTexture(key, color, radius) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}

export { WIDTH, HEIGHT };
