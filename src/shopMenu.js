import {
  state, onChange, offChange, addResource, spendResources,
} from './state.js';

// Sell converts `sell` units of a resource into 1 Gold; Buy spends 1 Gold for `buy` units
// back. `buy` is deliberately less than `sell` for every resource so round-tripping
// (sell then immediately buy back) always loses resources overall - there's no free
// arbitrage loop.
export const SHOP_RATES = {
  wood: { sell: 3, buy: 2 },
  stone: { sell: 2, buy: 1 },
  fiber: { sell: 4, buy: 3 },
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);

let menuEl = null;
let currentRenderFn = null;
let outsideHandler = null;

function escHandler(e) {
  if (e.key === 'Escape') closeShopMenu();
}

export function closeShopMenu() {
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

export function openShopMenu(structure, clientX, clientY, { onRemove }) {
  closeShopMenu();

  const container = document.getElementById('app');
  const appRect = container.getBoundingClientRect();
  menuEl = document.createElement('div');
  menuEl.className = 'popup-menu';
  const left = Math.min(Math.max(8, clientX - appRect.left + 12), appRect.width - 236);
  const top = Math.min(Math.max(8, clientY - appRect.top + 12), appRect.height - 260);
  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
  container.appendChild(menuEl);

  function render() {
    const rows = Object.entries(SHOP_RATES).map(([res, rate]) => {
      const invAmt = state.inventory[res];
      const canSell = invAmt >= rate.sell;
      const canBuy = state.inventory.gold >= 1;
      return `
        <div class="popup-row">
          <span class="popup-res">${cap(res)}</span>
          <span class="popup-amt">Inv ${invAmt}</span>
          <button data-dir="sell" data-res="${res}" title="Sell ${rate.sell} ${res} for 1 Gold" ${canSell ? '' : 'disabled'}>Sell ${rate.sell}</button>
          <button data-dir="buy" data-res="${res}" title="Spend 1 Gold for ${rate.buy} ${res}" ${canBuy ? '' : 'disabled'}>Buy ${rate.buy}</button>
        </div>`;
    }).join('');

    menuEl.innerHTML = `
      <div class="popup-head">
        <span>Shop — ${state.inventory.gold} Gold</span>
        <button class="popup-close" type="button" aria-label="Close">&times;</button>
      </div>
      ${rows}
      <button class="popup-remove" type="button">Remove shop</button>
    `;

    menuEl.querySelector('.popup-close').addEventListener('click', closeShopMenu);
    menuEl.querySelector('.popup-remove').addEventListener('click', () => {
      if (onRemove()) closeShopMenu();
    });
    menuEl.querySelectorAll('button[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = btn.dataset.res;
        const rate = SHOP_RATES[res];
        if (btn.dataset.dir === 'sell') {
          if (state.inventory[res] < rate.sell) return;
          spendResources({ [res]: rate.sell });
          addResource('gold', 1);
        } else {
          if (state.inventory.gold < 1) return;
          spendResources({ gold: 1 });
          addResource(res, rate.buy);
        }
      });
    });
  }

  currentRenderFn = render;
  onChange(render);
  render();

  outsideHandler = (e) => {
    if (menuEl && !menuEl.contains(e.target)) closeShopMenu();
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', outsideHandler, true);
    document.addEventListener('keydown', escHandler, true);
  }, 0);
}
