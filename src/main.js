import { initGame } from './game.js';
import './ui.js';

const game = initGame(document.getElementById('app'));

const dayNightEl = document.getElementById('dayNight');
setInterval(() => {
  const { isDay } = game.getTimeOfDay();
  dayNightEl.textContent = isDay ? 'Day' : 'Night';
  dayNightEl.classList.toggle('night', !isDay);
}, 500);
