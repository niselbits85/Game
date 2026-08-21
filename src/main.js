import Phaser from 'phaser';
import GatherScene, { WIDTH, HEIGHT } from './scenes/GatherScene.js';
import './ui.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#151a12',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [GatherScene],
});
