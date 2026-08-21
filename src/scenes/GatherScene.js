import Phaser from 'phaser';
import { addResource, yieldMultiplier } from '../state.js';

const WIDTH = 800;
const HEIGHT = 600;
const PLAYER_SPEED = 200;
const INTERACT_RADIUS = 60;

const RESOURCE_DEFS = {
  wood: { color: 0x3f8f4f, radius: 20, respawnMs: 5000, counts: 8, label: 'Tree' },
  stone: { color: 0x9a9a9a, radius: 16, respawnMs: 7000, counts: 6, label: 'Rock' },
  fiber: { color: 0x9fe08f, radius: 10, respawnMs: 3500, counts: 8, label: 'Bush' },
};

export default class GatherScene extends Phaser.Scene {
  constructor() {
    super('gather');
  }

  preload() {
    this.makeCircleTexture('player', 0x4fd1ff, 15);
    Object.entries(RESOURCE_DEFS).forEach(([type, def]) => {
      this.makeCircleTexture(type, def.color, def.radius);
    });
  }

  create() {
    this.player = this.physics.add.sprite(WIDTH / 2, HEIGHT / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.82);
    this.player.setMaxVelocity(PLAYER_SPEED);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.nodes = [];
    this.spawnNodes();

    this.rangeRing = this.add.circle(0, 0, INTERACT_RADIUS, 0xffffff, 0).setStrokeStyle(1, 0x4fd1ff, 0.15);

    this.add.text(WIDTH / 2, HEIGHT - 14, 'WASD/Arrows to move. Click a nearby node to gather.', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5, 1);
  }

  update() {
    this.handleMovement();
    this.rangeRing.setPosition(this.player.x, this.player.y);
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
  }

  spawnNodes() {
    const margin = 40;
    const minDist = 55;
    Object.entries(RESOURCE_DEFS).forEach(([type, def]) => {
      for (let i = 0; i < def.counts; i++) {
        const pos = this.pickSpot(margin, minDist);
        const sprite = this.add.sprite(pos.x, pos.y, type).setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.tryGather(sprite, type, def));
        this.nodes.push(sprite);
      }
    });
  }

  pickSpot(margin, minDist) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = Phaser.Math.Between(margin, WIDTH - margin);
      const y = Phaser.Math.Between(margin + 40, HEIGHT - margin);
      const clear = this.nodes.every((n) => Phaser.Math.Distance.Between(x, y, n.x, n.y) > minDist)
        && Phaser.Math.Distance.Between(x, y, WIDTH / 2, HEIGHT / 2) > minDist;
      if (clear) return { x, y };
    }
    return { x: Phaser.Math.Between(margin, WIDTH - margin), y: Phaser.Math.Between(margin, HEIGHT - margin) };
  }

  tryGather(sprite, type, def) {
    if (!sprite.active || !sprite.visible) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
    if (dist > INTERACT_RADIUS) {
      this.floatText(sprite.x, sprite.y, 'Too far', '#e86a6a');
      return;
    }
    const amount = yieldMultiplier(type);
    addResource(type, amount);
    this.floatText(sprite.x, sprite.y, `+${amount} ${def.label}`, '#ffe066');

    sprite.setVisible(false);
    sprite.disableInteractive();
    this.time.delayedCall(def.respawnMs, () => {
      sprite.setVisible(true);
      sprite.setInteractive({ useHandCursor: true });
    });
  }

  floatText(x, y, msg, color) {
    const text = this.add.text(x, y - 20, msg, {
      fontFamily: 'monospace', fontSize: '13px', color,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy(),
    });
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
