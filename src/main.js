import Phaser from 'phaser';
import GameScene, { WIDTH, HEIGHT } from './scenes/GameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#111111',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [GameScene],
});
