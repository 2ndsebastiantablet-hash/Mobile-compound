# OVERTIME: Development Roadmap

**Session** below means one working session with Claude, usually one or two prompts. Calendar estimates assume about 2–3 sessions a week, plus your own playtesting between sessions.

**Order:** core systems → mechanics → economy → balance → audio and visuals → modes → free roam → monetization and packaging → launch.
Balance comes *after* the new mechanics because cover, perks and upgrades all change difficulty. Free roam comes after the core settles, so shared changes aren't done twice.

---

## Where we are now: v0.6, content complete
- 50 floors × 3 versions, 85 enemies, 60 bosses, 40 weapons, ambushes
- Mobile and PC on-rails versions, organized project, standalone builds

---

## Phase 1: Foundations (1–2 sessions · week 1)
- [ ] **Save & Continue:** autosave at every floor, "Continue run" on the title screen
- [ ] **Settings menu:** music and SFX volume, aim assist and sensitivity, graphics quality, screen shake, left-handed mobile HUD
- [ ] **Tutorial on floor 1:** shooting, headshots, shooting projectiles, swapping, pickups
- [ ] **Better pause menu:** settings, restart floor, quit to title

## Phase 2: Combat depth (1–2 sessions · week 1–2)
- [ ] **Cover / duck button:** hold to duck (safe, can't shoot), release to pop up
- [ ] **Perk choice between floors:** pick 1 of 3 random run perks in the elevator
- [ ] Rebalance enemy fire so ducking matters

## Phase 3: Progression & economy (1–2 sessions · week 2–3)
- [ ] **Cash drops** from enemies and bosses
- [ ] **Upgrade shop between runs:** max HP, starting weapon, reload speed, extra slot
- [ ] **Weapon upgrade levels:** damage, magazine, special effect
- [ ] **Unlockable loadouts or characters**
- [ ] **Achievements**

## Phase 4: Balance & performance (2–3 sessions · weeks 3–5) ★ needs your playtesting
- [ ] Difficulty curve floors 1–50 (enemy counts, damage, accuracy)
- [ ] Boss and mini-boss tuning (health, attack timing, fairness of hit rules)
- [ ] Weapon tuning (rarity vs. power, melee usefulness)
- [ ] Performance on real phones; low/medium/high graphics presets
- [ ] Bug-fix pass from your playtest notes

**🏁 MILESTONE: ALPHA.** Full game loop, saves, progression, balanced. Ready for friends to test.

## Phase 5: Audio (2 sessions · week 5–6)
- [ ] Full soundtrack: a unique 3+ minute song per floor with sections; title and boss themes
- [ ] Jukebox on the title screen
- [ ] Sound effect pass: weapon punch, impacts, enemy voices or barks, ambience per zone

## Phase 6: Visual polish (2–3 sessions · weeks 6–7)
- [ ] Better lighting, muzzle flashes, impact and explosion effects
- [ ] Enemy hit reactions and death animations
- [ ] UI art pass: title screen, HUD, menus, transitions, floor-intro cards
- [ ] Visual identity per zone (decals, props, lighting accents)

## Phase 7: Modes & content (2 sessions · weeks 7–8)
- [ ] **Endless mode** after floor 50
- [ ] **Daily challenge:** fixed seed for everyone that day
- [ ] **Boss rush**
- [ ] **Lore:** collectible emails or notes that tell the tower's story
- [ ] Online leaderboards (needs a small server or service; decide in this phase)

**🏁 MILESTONE: BETA.** Feature complete. Wider testing and store preparation start.

## Phase 8: PC Free Roam (3–5 sessions · weeks 8–11)
- [ ] WASD + mouse-look controller, collision, sprint, crouch
- [ ] Room-triggered combat instead of auto-walking; elevator interaction
- [ ] AI rework: steering around furniture, cover relative to a moving player, flanking
- [ ] Bosses adapted to a moving player
- [ ] Wider rooms, side offices, branching paths, keycards
- [ ] Balance for a player who can dodge

## Phase 9: Monetization & packaging (2–3 sessions · weeks 11–12)
- [ ] **Mobile (free):** rewarded ads (revive, double cash, reroll perks), "Remove Ads" purchase, cosmetic shop
- [ ] Wrap as Android/iOS apps (Capacitor); ad network (e.g. AdMob) and in-app purchase setup
- [ ] **Steam (paid, ~$5–10):** desktop build (Electron or Tauri), Steam achievements and cloud saves
- [ ] Privacy policy, age rating questionnaires, store listings

**You'll need:** Google Play account ($25 once), Apple Developer ($99/yr), Steam Direct ($100 per game), and a Mac (or a cloud Mac service) to build the iOS app.

## Phase 10: Launch (ongoing · week 12+)
- [ ] Closed beta (TestFlight / Play internal testing / Steam playtest)
- [ ] Trailer, screenshots, store art; short clips for TikTok / YouTube Shorts
- [ ] Steam page up early to collect wishlists (ideally weeks before release)
- [ ] Soft launch on Android, fix issues, then full launch: mobile first, then Steam with free roam

**🏁 MILESTONE: LAUNCH**

---

## Summary
| | Sessions | Rough calendar |
|---|---|---|
| Alpha (Phases 1–4) | 5–9 | ~5 weeks |
| Beta (Phases 5–7) | 6–7 | ~3 weeks |
| Free roam (Phase 8) | 3–5 | ~3 weeks |
| Packaging + launch (Phases 9–10) | 2–3 + your time | ~2+ weeks |
| **Total** | **~16–24 sessions** | **~3 months** |

**What can slow things down:**
- How much playtesting time you have (balance can't be finished without it)
- App store review times (a few days each)
- Getting the developer accounts
- Restoring GitHub access (for backups and collaboration)

**Things you can reorder freely:**
- Audio (Phase 5) and visual polish (Phase 6) can happen any time.
- Free roam can start earlier if you'd rather launch on Steam first.
