export const RECIPES = [
  { id: 'axe', name: 'Axe', cost: { wood: 5, stone: 2 }, boosts: 'wood', desc: 'Doubles wood per chop' },
  { id: 'pickaxe', name: 'Pickaxe', cost: { wood: 4, stone: 3 }, boosts: 'stone', desc: 'Doubles stone per mine' },
  { id: 'basket', name: 'Basket', cost: { wood: 3, fiber: 4 }, boosts: 'fiber', desc: 'Doubles fiber per forage' },
];

export const state = {
  inventory: { wood: 0, stone: 0, fiber: 0 },
  crafted: { axe: false, pickaxe: false, basket: false },
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
function notify() { listeners.forEach((fn) => fn(state)); }

export function addResource(type, amount) {
  state.inventory[type] += amount;
  notify();
}

export function yieldMultiplier(type) {
  const recipe = RECIPES.find((r) => r.boosts === type);
  return recipe && state.crafted[recipe.id] ? 2 : 1;
}

export function canCraft(recipe) {
  return Object.entries(recipe.cost).every(([res, amt]) => state.inventory[res] >= amt);
}

export function craft(recipe) {
  if (state.crafted[recipe.id] || !canCraft(recipe)) return false;
  Object.entries(recipe.cost).forEach(([res, amt]) => { state.inventory[res] -= amt; });
  state.crafted[recipe.id] = true;
  notify();
  return true;
}
