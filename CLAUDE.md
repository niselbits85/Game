# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no lint or test tooling configured.

## Architecture

A resource-gathering game (walk around, click nodes to collect, craft tools) built with
[Phaser](https://phaser.io) 4 (Arcade Physics, canvas game world) plus a plain DOM sidebar for
inventory/crafting UI, wired together with Vite.

- `src/main.js` — creates the `Phaser.Game` instance, registers the scene, and imports `ui.js` to wire
  up the sidebar.
- `src/scenes/GatherScene.js` — the game world: player movement, resource node placement/respawn, and
  the gather interaction (click a node while in range). `RESOURCE_DEFS` at the top controls node
  color/size/respawn time/count per resource type — add a new resource type there and it's spawned
  automatically.
- `src/state.js` — the single source of truth for inventory counts, crafted tools, and recipes
  (`RECIPES`). Framework-agnostic on purpose: both the Phaser scene (`addResource`, `yieldMultiplier`)
  and the DOM UI (`craft`, `canCraft`) read/write through it rather than each other, and `onChange`
  lets the DOM UI re-render whenever it changes.
- `src/ui.js` — renders the inventory and crafting panels into the `#inventory`/`#recipes` elements
  defined in `index.html`, and handles craft button clicks. Plain DOM, not Phaser — the game canvas and
  the sidebar are two independent renderers kept in sync only through `state.js`.
- All node/player visuals are generated at runtime via `Phaser.GameObjects.Graphics.generateTexture`
  (colored circles) — there is no `assets/` folder. Swap in real sprite art via `preload()` if added
  later.

To add a new craftable tool: add an entry to `RECIPES` in `state.js` with a `boosts` field naming the
resource type it doubles — `yieldMultiplier()` and the UI panel pick it up automatically.

## Notes for future instances

- This folder is a git repository scoped to itself — do not run `git init` in a parent directory that
  contains unrelated files (e.g. the user's home directory).
