import {
  state, onChange, RECIPES, canCraft, craft, BUILDINGS, canAfford, selectBuilding, toggleTorch,
} from './state.js';

const invEl = document.getElementById('inventory');
const recipesEl = document.getElementById('recipes');
const buildingsEl = document.getElementById('buildings');
const buildHintEl = document.getElementById('buildHint');

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function render() {
  invEl.innerHTML = Object.entries(state.inventory)
    .map(([res, amt]) => `<div class="stat"><span class="label">${cap(res)}</span><span class="val">${amt}</span></div>`)
    .join('');

  recipesEl.innerHTML = RECIPES.map((r) => {
    const done = state.crafted[r.id];
    const ok = canCraft(r);
    const costStr = Object.entries(r.cost).map(([res, amt]) => `${amt} ${cap(res)}`).join(', ');

    if (r.id === 'torch' && done) {
      const equipped = state.torchEquipped;
      return `
        <button class="recipe toggle${equipped ? ' done' : ''}" data-toggle="torch">
          <div class="rname">${r.name} — ${equipped ? 'Equipped' : 'Unequipped'}</div>
          <div class="rdesc">${equipped ? 'Click to put it away' : 'Click to carry it again'}</div>
        </button>`;
    }

    return `
      <button class="recipe${done ? ' done' : ''}" data-id="${r.id}" ${done || !ok ? 'disabled' : ''}>
        <div class="rname">${r.name}${done ? ' ✓' : ''}</div>
        <div class="rdesc">${r.desc}</div>
        <div class="rcost">${costStr}</div>
      </button>`;
  }).join('');

  buildingsEl.innerHTML = BUILDINGS.map((b) => {
    const selected = state.selectedBuilding === b.id;
    const ok = canAfford(b.cost);
    const costStr = Object.entries(b.cost).map(([res, amt]) => `${amt} ${cap(res)}`).join(', ');
    return `
      <button class="recipe${selected ? ' selected' : ''}" data-build="${b.id}" ${!ok && !selected ? 'disabled' : ''}>
        <div class="rname">${b.name}${selected ? ' •' : ''}</div>
        <div class="rdesc">${b.desc}</div>
        <div class="rcost">${costStr}</div>
      </button>`;
  }).join('');

  buildHintEl.textContent = state.selectedBuilding
    ? 'Click the ground near you to place it. R to rotate, Esc to cancel.'
    : 'Pick a structure, then click the ground to place it.';
}

recipesEl.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('button[data-toggle]');
  if (toggleBtn) { toggleTorch(); return; }
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const recipe = RECIPES.find((r) => r.id === btn.dataset.id);
  if (recipe) craft(recipe);
});

buildingsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-build]');
  if (!btn) return;
  selectBuilding(btn.dataset.build);
});

onChange(render);
render();
