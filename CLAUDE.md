# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no lint or test tooling configured.

## Architecture

A top-down arcade shooter built with [Phaser](https://phaser.io) 4 (Arcade Physics) and Vite.

- `src/main.js` — creates the `Phaser.Game` instance and registers the scene list.
- `src/scenes/GameScene.js` — the entire game: player movement/rotation, shooting, enemy spawning/AI,
  collisions, HUD, and game-over/restart. Currently a single scene; split into multiple scenes (e.g. a
  boot/preload scene, a menu scene) only once there's an actual need for scene transitions.
- All visuals are generated at runtime via `Phaser.GameObjects.Graphics.generateTexture` (player
  triangle, enemy/bullet circles) rather than loaded image assets — there is no `assets/` folder. If real
  sprite art is added later, load it in a `preload()` and swap the texture keys.

Gameplay constants (speeds, cooldowns, damage, spawn interval) are defined at the top of `GameScene.js` —
tune them there rather than hardcoding magic numbers elsewhere.

## Notes for future instances

- This folder is a git repository scoped to itself — do not run `git init` in a parent directory that
  contains unrelated files (e.g. the user's home directory).
