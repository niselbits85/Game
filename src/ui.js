import { state, onChange, RECIPES, canCraft, craft } from './state.js';

const invEl = document.getElementById('inventory');
const recipesEl = document.getElementById('recipes');

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function render() {
  invEl.innerHTML = Object.entries(state.inventory)
    .map(([res, amt]) => `<div class="stat"><span class="label">${cap(res)}</span><span class="val">${amt}</span></div>`)
    .join('');

  recipesEl.innerHTML = RECIPES.map((r) => {
    const done = state.crafted[r.id];
    const ok = canCraft(r);
    const costStr = Object.entries(r.cost).map(([res, amt]) => `${amt} ${cap(res)}`).join(', ');
    return `
      <button class="recipe${done ? ' done' : ''}" data-id="${r.id}" ${done || !ok ? 'disabled' : ''}>
        <div class="rname">${r.name}${done ? ' ✓' : ''}</div>
        <div class="rdesc">${r.desc}</div>
        <div class="rcost">${costStr}</div>
      </button>`;
  }).join('');
}

recipesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const recipe = RECIPES.find((r) => r.id === btn.dataset.id);
  if (recipe) craft(recipe);
});

onChange(render);
render();
