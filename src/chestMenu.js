import {
  state, onChange, offChange, addResource, spendResources,
} from './state.js';

const RESOURCES = ['wood', 'stone', 'fiber'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

let menuEl = null;
let currentRenderFn = null;
let outsideHandler = null;

function escHandler(e) {
  if (e.key === 'Escape') closeChestMenu();
}

export function closeChestMenu() {
  if (!menuEl) return;
  menuEl.remove();
  menuEl = null;
  if (currentRenderFn) {
    offChange(currentRenderFn);
    currentRenderFn = null;
  }
  if (outsideHandler) {
    document.removeEventListener('pointerdown', outsideHandler, true);
    document.removeEventListener('keydown', escHandler, true);
    outsideHandler = null;
  }
}

export function openChestMenu(structure, clientX, clientY, { onRemove }) {
  closeChestMenu();

  const container = document.getElementById('app');
  const appRect = container.getBoundingClientRect();
  menuEl = document.createElement('div');
  menuEl.className = 'chest-menu';
  const left = Math.min(Math.max(8, clientX - appRect.left + 12), appRect.width - 216);
  const top = Math.min(Math.max(8, clientY - appRect.top + 12), appRect.height - 220);
  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
  container.appendChild(menuEl);

  function render() {
    const rows = RESOURCES.map((res) => {
      const invAmt = state.inventory[res];
      const chestAmt = structure.storage[res];
      return `
        <div class="chest-row">
          <span class="chest-res">${cap(res)}</span>
          <span class="chest-amt">Inv ${invAmt}</span>
          <button data-dir="deposit" data-res="${res}" title="Move 1 to chest" ${invAmt <= 0 ? 'disabled' : ''}>&rarr;</button>
          <span class="chest-amt">Chest ${chestAmt}</span>
          <button data-dir="withdraw" data-res="${res}" title="Move 1 to inventory" ${chestAmt <= 0 ? 'disabled' : ''}>&larr;</button>
        </div>`;
    }).join('');

    menuEl.innerHTML = `
      <div class="chest-head">
        <span>Storage Chest</span>
        <button class="chest-close" type="button" aria-label="Close">&times;</button>
      </div>
      ${rows}
      <button class="chest-remove" type="button">Remove chest</button>
    `;

    menuEl.querySelector('.chest-close').addEventListener('click', closeChestMenu);
    menuEl.querySelector('.chest-remove').addEventListener('click', () => {
      if (onRemove()) closeChestMenu();
    });
    menuEl.querySelectorAll('button[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        // structure.storage isn't part of state.js, so mutate it before the addResource/
        // spendResources call below - that call's notify() is what triggers our re-render,
        // and it should see both amounts already consistent when it fires.
        const res = btn.dataset.res;
        if (btn.dataset.dir === 'deposit') {
          if (state.inventory[res] <= 0) return;
          structure.storage[res] += 1;
          spendResources({ [res]: 1 });
        } else {
          if (structure.storage[res] <= 0) return;
          structure.storage[res] -= 1;
          addResource(res, 1);
        }
      });
    });
  }

  currentRenderFn = render;
  onChange(render);
  render();

  outsideHandler = (e) => {
    if (menuEl && !menuEl.contains(e.target)) closeChestMenu();
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', outsideHandler, true);
    document.addEventListener('keydown', escHandler, true);
  }, 0);
}
