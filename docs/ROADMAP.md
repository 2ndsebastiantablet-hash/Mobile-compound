# OVERTIME: Development Roadmap

**Session** below means one working session with Claude, usually one or two prompts. Calendar estimates assume about 2–3 sessions a week, plus your own playtesting between sessions.

**Order:** core systems → mechanics → economy → balance → audio and visuals → modes → free roam → monetization and packaging → launch.
Balance comes *after* the new mechanics because perks and upgrades change difficulty. Free roam comes after the core settles, so shared changes aren't done twice.

---

## Where we are now: v0.9, Phases 1–3 done
- 50 floors × 3 versions, 85 enemies, 60 bosses, 40 weapons, ambushes
- Mobile and PC on-rails versions, organized project, standalone builds

---

## Phase 1: Foundations (1–2 sessions · week 1) ✅ DONE (v0.7)
- [x] **Save & Continue:** autosave at every floor, "Continue run" on the title screen
- [x] **Settings menu:** music and SFX volume, aim assist and sensitivity, graphics quality, screen shake, left-handed mobile HUD
- [x] **Tutorial on floor 1:** shooting, headshots, shooting projectiles, swapping, pickups
- [x] **Better pause menu:** settings, restart floor, quit to title

## Phase 2: Run perks (1 session) ✅ DONE (v0.8)
- [x] **Perk choice between floors:** pick 1 of 3 random perks after every floor (31 perks, stackable, 1 free reroll per run, rare+ guaranteed after boss floors)
- ~~Cover / duck button~~ (dropped: not wanted)

## Phase 3: Progression & economy (1 session) ✅ DONE (v0.9)
- [x] **Cash** from every kill, boss and cleared floor (banked instantly, never lost)
- [x] **HQ upgrade shop:** 11 permanent upgrades (health, damage, reload, armor, floor heals, cash, rerolls, 4th perk choice, 4th weapon slot, starting weapon, life insurance)
- [x] **Armory:** weapon levels 1–5 (+damage, +magazine, mastery bonus)
- [x] **8 employees** with their own starting weapons and perks, unlocked by milestones or cash
- [x] **31 achievements** with cash rewards

## Phase 4: Balance & performance ✅ FIRST PASS DONE (v0.10) · keep sending playtest notes
- [x] Bug-fix pass from your playtest notes: achievement popup over the HUD, crawlers hidden behind the PC status bar, cubicle and pillar cover, flickering skyline in windows, bullet holes left on elevator doors, melee weapons facing the wrong way
- [x] Melee rework: weapons held upright with blades and axe heads facing forward; overhead chops and diagonal slashes pivoting from the shoulder
- [x] PC aiming: mouse capture, mouse speed setting, gun weight
- [x] Difficulty modes: Easy, Medium, Hard, Extra Hard (+3 achievements)
- [x] Continue a run as a different employee; cause of death on the game-over screen
- [x] Developer mode (god mode, give weapons/perks, spawn, skip floors, game speed)
- [x] Difficulty curve floors 1–50, measured with an autoplay bot: flatter enemy damage and health growth, fewer enemies at once, slower melee, minion cap
- [x] Weapon tuning: rarity now roughly tracks power (weak rares and epics buffed, double barrel trimmed)
- [x] Performance: static level geometry merged per room and only nearby rooms drawn (~70% fewer meshes, ~1.6x frame rate in software rendering)
- [ ] Boss and mini-boss fine-tuning from real play (bot can't judge fairness of hit rules)
- [ ] Test on real phones (old and new) and adjust graphics presets

**🏁 MILESTONE: ALPHA** (reached once the last two items are confirmed by your playtests). Full game loop, saves, progression, balanced. Ready for friends to test.

## Phase 5: Visual polish ✅ DONE (v0.11) · the big one
- [x] **Post-processing:** bloom glow on lights, flashes, fire and plasma; colour grading per lighting mood; vignette; retro filter (dithering, colour crunch, scanlines on FULL); red damage pulse, chromatic aberration on big hits, low-health heartbeat; pixel-dissolve transitions
- [x] **Dynamic lighting:** explosions, sparks and muzzle flashes light up the room; flashlight on night/blackout floors that follows your aim; pulsing alarm lights on lockdown floors; lightning through the windows on night floors
- [x] **Weapon feel:** brass casings, muzzle smoke and glow, per-gun coloured flashes that light up your hands, camera kick
- [x] **Hits & deaths:** knockback, blood/oil/goo splatter on walls and floors, pools under bodies; humans fall backward (headshots pop the head off), critters flip over, flyers crash and explode, machines spark and blow, bosses die in a chain of explosions; overkill still blows enemies apart; headshot freeze-frame
- [x] **Explosions:** flash light, shockwave ring, smoke columns, embers, scorch marks
- [x] **Projectiles** glow, enemies show muzzle flashes, weapon drops glow in their rarity colour
- [x] **Atmosphere:** floating dust in the light, sparking broken fixtures, steam vents, bubbling lab vapour, scrolling monitors, zone grime (coffee, oil, slime, blood) and wall cracks that get worse higher up
- [x] **Presentation:** floor intro cards, boss intro with letterbox and slow-motion, damage direction arcs, HUD hit/low-health/low-ammo reactions, glitching title logo
- [x] New settings: EFFECTS on/off, RETRO FILTER off/soft/full (graphics LOW turns off bloom, flash lights and ambient particles)

## Phase 6: Modes & content ✅ DONE (v0.13)
- [x] **Game mode screen:** Story, Endless, Daily Challenge, Boss Rush (later modes unlock by playing)
- [x] **Endless mode:** no top floor; past 50 the floors reuse upper-tower layouts and keep getting harder. A won story run can keep climbing
- [x] **Daily challenge:** same run for everyone each day (seeded start floor, floor versions, weapon, perks, perk offers) plus a twist of the day: Glass Cannon, Big Heads, Headcount, Night Shift, Volatile, One-Hit Wonder
- [x] **Boss rush:** the 10 bosses back to back with perks between fights, timed
- [x] **Lore:** 30 collectible memos telling the story of Halvorsen-Pike Holdings; read them at HQ > FILES (+3 achievements)
- [x] **Records:** local leaderboards per mode at HQ > RECORDS
- [ ] Online leaderboards: need a small server or service; planned with the store release (Phase 8)

## Phase 6.5: Collection & extras (in progress, split over several prompts)
- [x] Duller lights on bright floors (washed-out enemy heads)
- [x] **Enemy skins:** 3 themed variants per enemy family + a rare GOLDEN skin (tougher, 5x cash)
- [x] **Enemy log** (HQ > LOG): unlocked on first kill; lore, how it fights, stats, rotating 3D model with every skin you've killed; bosses too
- [x] **11 new HQ upgrades** (22 total) and **Armory levels 6-10** (level 10 = gold plated LEGEND)
- [x] **36 daily twists** (30 new), built from a knob system
- [x] **124 new achievements** (161 total) with new tracked stats
- [x] **50 new memos** (80 total)
- [ ] **Stand weapon** (golden tier): a fighting spirit that cancels enemy attacks with a finger laser, lucky, rapid punches, super speed
- [ ] **Requiem enemies:** rare, stronger versions with new abilities, only in a new Ultra Hard mode
- [ ] **Time weapon** replacing The Remote: rewinds time on demand and rearranges the whole room each time

**🏁 MILESTONE: BETA.** Gameplay feature complete (audio still to come). Wider testing and store preparation start.

## Phase 7: PC Free Roam (3–5 sessions · weeks 7–10)
- [ ] WASD + mouse-look controller, collision, sprint, crouch
- [ ] Room-triggered combat instead of auto-walking; elevator interaction
- [ ] AI rework: steering around furniture, cover relative to a moving player, flanking
- [ ] Bosses adapted to a moving player
- [ ] Wider rooms, side offices, branching paths, keycards
- [ ] Balance for a player who can dodge

## Phase 8: Monetization & packaging (2–3 sessions · weeks 10–11)
- [ ] **Mobile (free):** rewarded ads (revive, double cash, reroll perks), "Remove Ads" purchase, cosmetic shop
- [ ] Wrap as Android/iOS apps (Capacitor); ad network (e.g. AdMob) and in-app purchase setup
- [ ] **Steam (paid, ~$5–10):** desktop build (Electron or Tauri), Steam achievements and cloud saves
- [ ] Privacy policy, age rating questionnaires, store listings

**You'll need:** Google Play account ($25 once), Apple Developer ($99/yr), Steam Direct ($100 per game), and a Mac (or a cloud Mac service) to build the iOS app.

## Phase 9: Audio (2 sessions · weeks 11–12) · saved for last, by choice
- [ ] Full soundtrack: a unique 3+ minute song per floor with sections; title and boss themes
- [ ] Jukebox on the title screen
- [ ] Sound effect pass: weapon punch, impacts, enemy voices or barks, ambience per zone

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
| Alpha (Phases 1–4) | 4–8 | ~4–5 weeks |
| Beta (Phases 5–6) | 4–5 | ~2 weeks |
| Free roam (Phase 7) | 3–5 | ~3 weeks |
| Packaging, audio + launch (Phases 8–10) | 4–5 + your time | ~3+ weeks |
| **Total** | **~15–23 sessions** | **~3 months** |

**What can slow things down:**
- How much playtesting time you have (balance can't be finished without it)
- App store review times (a few days each)
- Getting the developer accounts
- Restoring GitHub access (for backups and collaboration)

**Things you can reorder freely:**
- Audio is deliberately last (Phase 9), but it can still move earlier any time.
- Free roam can start earlier if you'd rather launch on Steam first.
