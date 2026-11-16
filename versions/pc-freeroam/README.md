# PC Free Roam (planned)

This folder is reserved for the free-roam PC version: WASD movement, mouse-look (pointer lock),
collision, room-triggered combat and AI that can follow a moving player.

It will reuse everything in `../../shared/` (floors, enemies, bosses, weapons, textures, audio)
and add its own controller/flow code here, so the mobile and PC on-rails versions are untouched.
Once it exists, `node tools/build.mjs` will automatically build it to `dist/pc-freeroam/`.
