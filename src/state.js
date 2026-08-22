export const RECIPES = [
  { id: 'axe', name: 'Axe', cost: { wood: 5, stone: 2 }, boosts: 'wood', desc: 'Doubles wood per chop' },
  { id: 'pickaxe', name: 'Pickaxe', cost: { wood: 4, stone: 3 }, boosts: 'stone', desc: 'Doubles stone per mine' },
  { id: 'basket', name: 'Basket', cost: { wood: 3, fiber: 4 }, boosts: 'fiber', desc: 'Doubles fiber per forage' },
];

export const BUILDINGS = [
  { id: 'wall', name: 'Wall', cost: { wood: 3 }, desc: 'A simple fence segment' },
  { id: 'campfire', name: 'Campfire', cost: { wood: 4, stone: 2 }, desc: 'A cozy fire for your base' },
  { id: 'chest', name: 'Storage Chest', cost: { wood: 5, fiber: 2 }, desc: 'Right-click to store resources' },
  { id: 'torch', name: 'Torch', cost: { wood: 2, fiber: 1 }, desc: 'Cheap, portable light for the dark' },
];

export const state = {
  inventory: { wood: 0, stone: 0, fiber: 0 },
  crafted: { axe: false, pickaxe: false, basket: false },
  selectedBuilding: null,
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
export function offChange(fn) { listeners.delete(fn); }
function notify() { listeners.forEach((fn) => fn(state)); }

export function addResource(type, amount) {
  state.inventory[type] += amount;
  notify();
}

export function yieldMultiplier(type) {
  const recipe = RECIPES.find((r) => r.boosts === type);
  return recipe && state.crafted[recipe.id] ? 2 : 1;
}

export function canAfford(cost) {
  return Object.entries(cost).every(([res, amt]) => state.inventory[res] >= amt);
}

export function spendResources(cost) {
  Object.entries(cost).forEach(([res, amt]) => { state.inventory[res] -= amt; });
  notify();
}

export function canCraft(recipe) {
  return canAfford(recipe.cost);
}

export function craft(recipe) {
  if (state.crafted[recipe.id] || !canCraft(recipe)) return false;
  spendResources(recipe.cost);
  state.crafted[recipe.id] = true;
  notify();
  return true;
}

export function selectBuilding(id) {
  state.selectedBuilding = state.selectedBuilding === id ? null : id;
  notify();
}
