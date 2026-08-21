# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no lint or test tooling configured.

## Architecture

A 3D, top-down resource-gathering game (walk around, click nodes to collect, craft tools) built with
[three.js](https://threejs.org) (a fixed angled `PerspectiveCamera` looking down at the scene, WASD moves
the player in screen-relative X/Z) plus a plain DOM sidebar for inventory/crafting UI, wired together
with Vite.

- `src/main.js` — calls `initGame()` to boot the three.js scene into `#app`, and imports `ui.js` to wire
  up the sidebar. No framework — just two independent entry points sharing `state.js`.
- `src/game.js` — the entire game world: scene/camera/lighting setup, procedural node/player meshes
  (`buildTree`/`buildRock`/`buildBush`, a `CapsuleGeometry` player — no `assets/` folder, no loaded
  models), keyboard movement, raycaster-based click-to-gather, node respawn, and the screen-projected
  floating "+1" pickup text. `RESOURCE_DEFS` at the top controls color/respawn time/count per resource
  type — add a new type there and give it a builder in `BUILDERS`.
- `src/state.js` — the single source of truth for inventory counts, crafted tools, and recipes
  (`RECIPES`). Framework-agnostic on purpose: `game.js` (`addResource`, `yieldMultiplier`) and the DOM UI
  (`craft`, `canCraft`) read/write through it rather than each other, and `onChange` lets the DOM UI
  re-render whenever it changes.
- `src/ui.js` — renders the inventory and crafting panels into the `#inventory`/`#recipes` elements
  defined in `index.html`, and handles craft button clicks. Plain DOM — the game canvas and the sidebar
  are two independent renderers kept in sync only through `state.js`.

Gather interaction is proximity-based, not click-adjacent: a click raycasts against node meshes to find
*which* node was clicked, then a separate flat-distance check (`INTERACT_RADIUS`, in world X/Z) against
the player's position decides whether the click actually lands. Keep both checks if you touch this path —
the raycast alone doesn't enforce range.

To add a new craftable tool: add an entry to `RECIPES` in `state.js` with a `boosts` field naming the
resource type it doubles — `yieldMultiplier()` and the UI panel pick it up automatically.

## Notes for future instances

- This folder is a git repository scoped to itself — do not run `git init` in a parent directory that
  contains unrelated files (e.g. the user's home directory).
