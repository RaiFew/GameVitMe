# GameVitMe

A real-time multiplayer party-game platform. Six browser games, private or public
rooms, guest or registered play, and a server-authoritative ranked system.

---

## 1. What this is

Players create or join a room, pick a game, and everyone plays together in real
time over a websocket. Rooms have a lobby (settings, ready-up, invites), then a
game session. Games are server-authoritative: the client sends intent ("I
clicked this card"), never outcomes.

Registered users can also play **solo ranked runs** of Number Rush that are
scored and recorded on the server.

---

## 2. Architecture

```
apps/web          React 19 + Vite + Tailwind v4 + Zustand + React Router
apps/server       Fastify 4 + socket.io 4 + Drizzle ORM + Postgres (postgres.js)
packages/game-engine    GameDefinition contract + RoomRunner (shared by all games)
packages/games/*        one package per game, engine-only, zero I/O
packages/shared-types   DTOs shared by client and server
```

Every game implements the same contract in `packages/game-engine/src/types.ts`:

```ts
interface GameDefinition<TState, TPlayerView, TSettings> {
  id, name, version, minPlayers, maxPlayers
  defaultSettings, settingsFields
  setup(ctx, settings): TState
  getCurrentPhase(state)
  validateMove(state, move, ctx)
  processMove(state, move, ctx)
  getPlayerView(state, playerId, ctx): TPlayerView   // the only thing a client sees
  checkGameEnd(state)
  onTimerExpired?, onPlayerDisconnected?, onPlayerReconnected?
}
```

`GameContext` gives a game its room, players, a `random()` it must use for all
randomness, and broadcast/send helpers. `RoomRunner` owns the state and pushes
each player's projected view to them and only them.

**The load-bearing idea:** games are pure engine packages. A game module never
touches the database, the socket, or the clock's wall time directly. That is why
all six games run through identical plumbing, and why ranked anti-cheat is
inherited rather than rebuilt.

### Why a ranked run is just a normal room

Ranked Number Rush is not a parallel system. It is a normal room with one
player and a server-chosen `variant`. Same `RoomRunner`, same `game:action`
handling, same `game:sync` reconnect path. Reconnect and anti-cheat therefore
come from the architecture that already existed, not from new code.

---

## 3. Database

Postgres via Drizzle. Schema in `apps/server/src/db/schema.ts`; migrations are
hand-written SQL in `apps/server/drizzle/NNNN_name.sql` with the journal at
`drizzle/meta/_journal.json`. Apply with:

```bash
pnpm --filter server db:migrate
```

| Table | Purpose |
|---|---|
| `users` | accounts and guest accounts (`is_guest`), presence, avatar, username, display name |
| `accounts`, `sessions`, `verifications` | Better Auth (email/OAuth/password) |
| `friendships` | request/addressee pairs, status `pending`/`accepted`/`blocked`, unique per direction |
| `rooms`, `room_participants` | persisted room metadata and seats; the live game runs on the in-memory `roomManager` |
| `game_invitations` | in-room invites; partial unique index allows only one `PENDING` invite per (room, invitee) |
| `game_sessions`, `game_session_players` | session log, winners, replay log |
| `codenames_word_files` | user-uploaded Codenames word lists |
| `leaderboards` | generic ranking registry (see §6) |
| `leaderboard_entries` | one row per (leaderboard, user) holding that user's best score |
| `ranked_game_results` | every ranked attempt, kept separate from the board |

Enums: `user_status`, `friendship_status`, `room_status`, `game_session_status`,
`invitation_status`, `leaderboard_direction`, `ranked_run_status`.

`leaderboards.season` defaults to `'all-time'` and is **unused today** — see §9.

---

## 4. Games

| id | Name | Players | Notes |
|---|---|---|---|
| `spyfall` | Spyfall | 4–12 | host-as-Game-Master option |
| `werewolf` | Werewolf | 4–12 | forces Host Mode |
| `salem` | Salem 1692 | 4–12 | forces Host Mode, no settings card |
| `codenames` | Codenames | 2–20 | two teams; 2-player mode needs exactly 2 |
| `rock-paper-scissors` | Rock Paper Scissors | 2–20 | Duel / Battle Royale / Points Race |
| `number-grid` | Number Grid / Number Rush | 1–20 | also the only ranked game |

### Spyfall
16 shuffled locations, one secret. Exactly one Spy; everyone else gets a random
role for that location. Phases: `ROLE_REVEAL → QUESTIONING → ACCUSATION_VOTE →
SPY_GUESS → GAME_OVER`. The questioner rotates; you cannot ask yourself or the
previous questioner. One indictment per player per round; accusation starts
sequential clockwise voting, the accused may not vote, and **only a unanimous
all-YES convicts**.

- Unanimous conviction of the Spy → non-spies win.
- Unanimous conviction of an innocent → the Spy escapes and wins.
- A convicted Spy then guesses the location; correct guess → Spy wins.
- Round timer expires → Spy wins.

Settings: `hostMode` (default true), `roundDurationSeconds` (480, 30–5999),
`locationCount` (16, 8–16).

### Werewolf
20 roles exist in the registry, but the lobby card only exposes five:
`werewolfCount` (2, 1–4), `seerEnabled`, `witchEnabled`, `defenderEnabled` (all
true), `constableEnabled` (false). Defaults scale with player count (6+ players
→ 2 wolves; 8+ → `min(3, floor(n/3))` wolves plus seer/witch/defender/doctor).

Host Mode is forced, so the host moderates and does not play. Night is a
dynamic queue built only from roles that still have a living player, ordered by
role priority, each with its own timer (werewolf 20s, witch 20s, defender 15s,
constable 15s, seer 10s); expiry auto-advances. Day is a plurality vote with an
explicit skip. **A tie eliminates nobody** — a candidate is removed only if the
vote beats the skip count.

- Village wins when zero werewolves remain.
- Werewolves win when living wolves ≥ living non-wolves.

### Salem 1692
`settingsFields` is deliberately empty: cards are physical, so the host deals
and records everything. Forces Host Mode; the host does not play.

Phases: `LOBBY → NIGHT_WITCH → NIGHT_CONSTABLE → MORNING → CONFESSION →
RESOLUTION → (NIGHT_WITCH | GAME_OVER)`. Role tokens are emitted only to the
socket that claimed them, never into a player view. On entering MORNING the
server resolves the night exactly once: no witch target → no death; witch target
== constable protection → no death; otherwise the witch's target dies, at most
one death per night.

**There is no automated win condition** — the host ends the game.

### Codenames
25 words (a custom pool is used if it has ≥25 entries, otherwise the built-in
dictionary). 9 cards for the random starting team, 8 for the other, 7 neutral
bystanders, 1 assassin. Teams are RED/BLUE, each with a spymaster and
operatives; only the active team's spymaster may give a clue. A clue of `0`
means unlimited guesses; otherwise `guessesRemaining = number + 1`.

- Win by finding all of your team's cards.
- Touching the assassin ends the match for the guessing team.
- A neutral bystander ends the turn immediately as a mistake.

Settings: `wordSource` (DEFAULT / custom file), `roundDurationSeconds` (120,
30–600). `gameMode` (`CLASSIC` / `TWO_PLAYER`) is chosen at room creation.

### Rock Paper Scissors
All active players choose within the round timer; non-choosers get a random
auto-pick. All-same and all-three-present are ties. With exactly two distinct
choices, winners gain a point and losers are eliminated in Battle Royale.

- `DUEL` / `POINTS_RACE` end when someone reaches `targetScore`; ties share.
- `BATTLE_ROYALE` ends at one or fewer alive (zero alive = joint champions).
- Auto-selects `DUEL` for 2 players, `BATTLE_ROYALE` for 3+.

Settings: `gameMode` (default DUEL), `targetScore` (3, 1–15), `hostMode`
labelled "Screen Mode" (false), `roundDurationSeconds` (10, 5–60).

### Number Grid / Number Rush
A `gridSize²` grid of shuffled number circles. The click order is the ascending
`numberSequence` — find the smallest remaining value. Wrong click costs 1 HP if
`wrongClickDamage` is on. At round resolution (only with 2+ alive):
`LAST_PLAYER` damages the lowest-progress unfinished player, otherwise the last
finisher; `EVERYONE_EXCEPT_FIRST` damages everyone but the first finisher. HP 0
eliminates.

Ends when ≤1 player is alive (only if the run started with 2+), everyone is
dead, or the final round completes. On the final round, survivors are ordered by
HP then fewest wrong clicks.

Settings: `difficultyMode` (DEFAULT 2,3,4…10 / CUSTOM host-picked / RANDOM 2–10
per round), `totalRounds` (9, 1–20), `maxHp` (3, 1–10), `damageMode`
(LAST_PLAYER / EVERYONE_EXCEPT_FIRST), `wrongClickDamage` (true),
`hostMode` (false).

#### Variants

| Variant | Where | Rules |
|---|---|---|
| `STANDARD` | normal room | sequential 1..N, host settings apply, guests allowed |
| `CHAOS` | normal room | `gridSize²` unique values from 1–1000 sorted ascending, grid size random 2×2–10×10 **including round 1**. Guests allowed. **No ranked points.** |
| `RANKED_TIME` | ranked, solo | exactly 10 stages, no HP, wrong click = 10 s lock, score = total ms, **lower is better** |
| `RANKED_TOWER` | ranked, solo | endless, DEFAULT progression, 3 HP, score = floors cleared, **higher is better** |
| `RANKED_CHAOS` | ranked, solo | endless, 1–1000 numbers, 3 HP, score = floors cleared, **higher is better** |

Ranked variants' settings are server-fixed: a client chooses *which* mode to
play, never how it is scored.

---

## 5. Rules that hold everywhere

1. **The client never decides an outcome.** It sends intent. The server owns the
   board, the expected value, HP, the round timer, and the score.
2. **A game module uses `ctx.random()` for every random decision.** Never
   `Math.random()` — except in `calculateRoundGridSizes`, which is host-facing
   configuration rather than round state (see §8).
3. **`getPlayerView` is the only channel to a client.** State a player must not
   see (other players' boards, the answer sequence before it is reached, hidden
   roles) stays in master state.
4. **Identity comes from the database, never from the socket.** See §7.
5. **A ranked run is solo.** A room with more than one player requesting a
   ranked variant is refused.
6. **Only cleared floors count.** A floor you died on is not scored, so dying
   cannot improve a time tie-break.

---

## 6. Ranking system

Generic by design — not a Number-Rush-specific table.

- `leaderboards` is a registry: `key` (stable identifier code branches on),
  `name`, `category`, `gameType`, `mode`, `metric`, `direction`, `season`.
- `leaderboard_entries` holds one row per (board, user) with that user's **best
  score only**, plus a stored `rank`.
- `ranked_game_results` holds **every attempt**, so a worse run is auditable and
  a board can be rebuilt from history.

### Direction

`HIGHER_IS_BETTER` or `LOWER_IS_BETTER`, per board. A board that assumed
"higher wins" cannot express a time, and Time is a first-class mode — so
Tower/Chaos are `HIGHER_IS_BETTER` on floors and Time is `LOWER_IS_BETTER` on
milliseconds.

### Adding a future ranking

One entry in `LEADERBOARD_DEFINITIONS`, one `leaderboardKeyFor` case in the game
engine, one row inserted by `ensureLeaderboards()`. No new table, route, or page.
The Ranking page reads its category and mode filters from that registry, so a
new game's board appears on the existing page.

### The three boards

| key | Metric | Direction |
|---|---|---|
| `number-rush.time` | total completion ms | LOWER_IS_BETTER |
| `number-rush.tower-climb` | highest floor | HIGHER_IS_BETTER |
| `number-rush.chaos` | highest floor | HIGHER_IS_BETTER |

They are never combined.

### API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/ranking/leaderboards` | public | the registry |
| `GET /api/ranking/leaderboards/:key` | public, optional viewer | top 50 + viewer's own rank + total ranked |
| `GET /api/ranking/me` | required | viewer's personal bests and recent attempts |

A signed-out or guest visitor can read every board; their panel is simply empty.
`viewerId` only marks the viewer's row — it never changes the ordering or the
scores anyone else sees.

### Pages

- `/ranking` — public. Category and mode filters, leaderboard table, viewer's
  rank, personal best, total players ranked.
- `/ranked` — mode picker. Each card states the metric, which end of the scale
  wins, the full rules, and the player's personal best before they start.

---

## 7. Security and anti-cheat

### Socket identity is not trustworthy

`apps/server/src/socket/gateway.ts` auth middleware has three fallbacks and the
last is `socket.handshake.auth.user`, which the client supplies freely. An
unauthenticated caller can therefore claim any user id it likes.

`resolveRankedUser()` in `apps/server/src/ranking/ranking.service.ts` is the
only gate that matters for ranked play: it looks the id up in `users` and
refuses any row that is missing or `is_guest`. Guests therefore never reach the
leaderboard at all — no entry, no result row, nothing a later request could
claim.

### Everything scored is built server-side

- **The result is a pure function of server state.** `buildRankedResult` reads
  only state the engine owns. The client never submits a time, a floor, a score,
  a stage count, or a ranking position.
- **Ranked settings cannot be influenced.** `setup()` discards caller settings
  entirely for ranked variants, so asking for a 1-round Time run gets 10 stages.
- **The 10-second penalty is a timestamp, not a timer.** `lockedUntil` is
  compared against `Date.now()` inside `validateMove`. It cannot be shortened,
  cleared, or bypassed by a refresh, and needs no timer object.
- **Stage times are summed from server clocks** at round resolution.
- **Boards are generated with `ctx.random()`** on the server.
- **Ranked is gated at `game:start`,** not at the UI. Forging a variant in the
  socket payload gets a refusal, not a run.

---

## 8. Realtime and HTTP surface

Sockets join `room:<roomId>` and `user:<userId>`.

**Transports.** The client pins `transports: ['polling', 'websocket']` and starts
on polling. This is not a default worth trusting: the Cloudflare proxy in front of
`api.frostespresso.site` completes a WebSocket handshake and then delivers
nothing (§10 #13), so a connection that opens with an upgrade is silently deaf.
`socketService.recycle()` drops the engine and re-handshakes, which is the only
recovery from that state.

**Room:** in — `create`, `join`, `leave`, `ready`, `kick`, `transfer_host`,
`update_settings`. Out — `created`, `joined`, `state`, `updated`,
`player_joined`, `player_left`, `player_ready`, `player_kicked`, `kicked_out`,
`closed`, `error`.

**Game:** in — `start`, `action`, `sync`, `return_lobby`. Out — `started`,
`finished`, `action_error`, `returned_to_lobby`, and `game:state` /
`game:state` sync pushes. `game:action_error` codes include
`RANKED_LOGIN_REQUIRED`, `RANKED_NOT_SOLO`, `INVALID_PLAYER_COUNT`,
`NOT_ENOUGH_PLAYERS`, `ROLE_CONFIG_INCOMPLETE`, `TOO_MANY_ROLES`.

**Chat:** `chat:message` → `chat:new_message`.
**Friends:** `friend:request_received`, `friend:request_accepted`.
**Engine broadcasts:** `number_grid:round_ended`, `number_grid:player_eliminated`,
`salem:role_token`.

**HTTP** (no prefixes; full paths inline in `apps/server/src/index.ts`):

| File | Paths |
|---|---|
| `auth.routes.ts` | `/auth/finish`, `/api/auth/handoff`, `/api/auth/dev-login` |
| `user.routes.ts` | `/api/users/me` (GET/PUT), `/api/users/search` |
| `friend.routes.ts` | `/api/friends`, `/api/friends/requests`, `/api/friends/sent`, `/api/friends/request`, `/api/friends/accept`, `/api/friends/reject`, `/api/friends/:friendshipId` |
| `invitation.routes.ts` | `/api/invitations`, `/api/invitations/sent`, `/api/invitations/accept`, `/api/invitations/decline` |
| `room.routes.ts` | `/api/games`, `/api/rooms`, `/api/rooms/:code` |
| `codenames.routes.ts` | `/api/codenames/word-files` (GET/POST), `/api/codenames/word-files/:id` (GET/DELETE) |
| `ranking.routes.ts` | see §6 |

---

## 9. Workflow

### Run it

```bash
pnpm install
pnpm --filter server db:migrate     # apply migrations
pnpm dev                            # turbo: all packages + both apps
```

### Verify it

```bash
pnpm -r type-check                  # all packages + both apps
pnpm build
pnpm -r test                        # 125 tests across all game packages
npx tsx apps/server/src/ranking/ranking.check.ts   # DB-backed ranking gate + write path
```

`ranking.check.ts` is a standalone script rather than a test because it needs a
live database. It verifies guest and unknown-id rejection, that a worse run
never lowers a personal best, that worse runs still enter history, that ranks
recompute, and that the viewer row is marked — then deletes its own rows.

### Add a game

1. New package `packages/games/<name>` implementing `GameDefinition`. Use
   `ctx.random()`, keep state in master state, project to a player view.
2. Add `test/<name>.test.ts` (node:test + `node:assert/strict`).
3. Register it (`GameRegistry`) and add it to the list in `CreateRoomPage.tsx`.
4. Add a lobby settings card if it needs host configuration.

No server changes are needed for a new game — the plumbing is generic.

### Add a ranked mode

1. Add the variant to `settingsForVariant()` in the game engine (server-fixed
   rules) and a case to `leaderboardKeyFor()`.
2. Add a `LEADERBOARD_DEFINITIONS` entry with the metric and direction.
3. Extend `buildRankedResult` for the mode's scoring.

No schema change, no new route, no new page.

---

## 10. Bugs found and fixed

| # | Bug | Fix |
|---|---|---|
| 1 | **Chaos drew 1..N, not 1..1000.** `drawChaosNumbers` built its pool from `1..count`, so a Chaos board was numerically identical to a standard one and the "random 1–1000" rule was silently untrue. Caught by a test asserting the sequence has gaps. | Rejection sampling over a `Set` from the full 1..1000 range. |
| 2 | **`requireAuth` used for optional auth.** It *sends* a 401 rather than throwing, so a try/catch around it left the response already written — signed-out leaderboard viewing was broken. | Added `resolveRequestSession()` which returns the session or null and never replies. `requireAuth` now wraps it. |
| 3 | **Leaderboard key drift.** The service built keys as `number-rush.${mode}`, producing `number-rush.tower` while the board is `number-rush.tower-climb` — every Tower Climb result would have failed to record. | The engine's own `leaderboardKeyFor()` is the single source of truth; the service maps mode → variant and asks the engine. |
| 4 | **Client could override ranked scoring.** `setup()` spread caller settings over the server's, so a client could request a 1-round Time run. | `setup()` discards caller settings entirely for ranked variants. |
| 5 | **Expected number assumed `+1` arithmetic.** Chaos boards hold arbitrary values, so "next number" was undefined. | Per-round `numberSequence` plus an `expectedIndex` cursor. Also replaced an O(n) `indexOf` lookup that could drift from the board. |
| 6 | **Socket handlers registered after an `await`.** The client treats a socket as usable on `connect`, so a first emit reached a socket with no listener and was dropped — room join failed on mobile. | Handlers register synchronously before any `await`. |
| 7 | **Dead re-export collision.** `moves/index.ts` re-exported names that `index.ts` also re-exported via `export *`. | Removed. |
| 8 | **Abandoned rooms were never freed.** The socket `disconnect` handler only touched presence, so closing a tab left the room and its player marked `connected: true` in memory for the full 2-hour TTL — and `leaveRoom` refused to destroy a room whose status was `playing`, so a mid-game room everyone had dropped from was never destroyed at all. `room:leave` only fires on an explicit button click, never on navigation. | `disconnect` now calls `roomManager.markDisconnected`, which flips the seat to disconnected but **keeps** it, so a refresh rejoins as the same seat rather than a new one at the end of the row. A room with nobody connected gets `emptySince` stamped, and the 5-minute sweep reclaims it after 10 minutes. |
| 9 | **`game:sync` scanned every room in memory.** The fallback when no `roomId` was supplied looped over `(roomManager as any).rooms.values()` and `.some()`-ed each room's players — synchronously, on every page refresh and reconnect. Bug 8 let dead rooms pile up, so this grew over time and blocked the event loop. That is the "server gets laggy" symptom. | Added a `playerId → roomId` index to `RoomManager`; the fallback is now `getRoomByPlayer()`. |
| 10 | **Lobby actions failed silently.** `setReady`, `updateSettings`, `kickPlayer` and `transferHost` in `useRoom` emitted and discarded the ack, depending entirely on the server's `room:state` broadcast to change the screen. On a slow or dropped connection that broadcast never arrived, so the buttons did nothing at all and the lobby looked frozen. | Each action applies its change locally, refuses to emit on a disconnected socket, and surfaces the ack error in the lobby. Also fixed `roomStore.updatePlayer`, which matched on `p.userId` — a field `PlayerState` does not have, so it matched nothing and no optimistic update could ever apply. |
| 11 | **Joins leaked listeners and failed early.** `room:state` and `room:error` were attached *after* the emit and removed only on the error path, so every join attempt left handlers on the shared socket — a stale `room:state` handler would call `setRoom` for a room the user had already left. The 6s deadline also fired while the join was still in flight, reporting a failure for a room that appeared moments later. | Listeners attach before the emit and are torn down on every exit path. Deadline raised to 15s. |
| 12 | **Joins hung forever against a slow database.** The private-room path awaited `hasValidRoomInvite` with no bound; if the pool was saturated the handler never answered, so the client gave up on its own timer with a generic "request timed out". | The wait is bounded and returns a real, actionable error instead of silence. |
| 13 | **Cloudflare accepted WebSocket upgrades it never wired up.** Measured against `api.frostespresso.site`: a socket.io connection whose *first* request is a WebSocket upgrade completes the handshake and fires `connect`, then drops every emit — **0/3** such connections ever delivered an ack, against **8/8** that started on polling. Raw polling GETs through the same proxy intermittently returned 502. Because socket.io reconnects on the last-used transport, one bad upgrade could strand a client on the dead transport permanently, which is why "still can't join" persisted across the server-side fixes. | Transport order pinned to start on polling (`transports: ['polling', 'websocket']`), and a join timeout now recycles the engine for a fresh handshake and retries once, so only a second failure reaches the user. |

---

## 11. Not done

### Deliberately not implemented (per specification)

- **Seasons and weekly reset.** `leaderboards.season` exists and defaults to
  `'all-time'`; nothing reads it yet. Ranks are already stored per row, so a
  season can freeze order at season end.
- **Trophies.** No trophy data, no trophy UI, no awarding.
- **Play Streak and any other future ranking.** The schema supports them; they
  are not configured.
- **Ranked seasonal / all-time toggle.** Only all-time exists.

### Known gaps and rough edges

1. **Host Number Grid settings never reach the engine.** The lobby settings card
   writes to `room.settings` at the top level, but `game.handler.ts` reads
   `room.settings.gameSettings`. So the host's difficulty / rounds / HP choices
   are currently ignored and the engine falls back to defaults. Pre-existing,
   predating the ranked work; left alone to avoid changing normal-mode behaviour
   silently. The new Chaos toggle writes to `gameSettings` so it works.
2. **`calculateRoundGridSizes` mode `RANDOM` uses `Math.random()`** rather than
   a passed-in generator. It is host-facing setup, not round state, so it is not
   a ranked-cheat surface — but it is inconsistent with rule 2 in §5.
3. **Werewolf's 20-role registry is largely unreachable.** Only six roles are
   exposed through the five settings fields; `NEUTRAL` winner types (tanner,
   fool, serial killer) are declared but never awarded.
4. **Salem has no automated win condition.** The host ends the game manually.
5. **Ranks are recomputed for the whole board on every write.** Fine at
   one-row-per-user scale; a large board would want an incremental update or a
   periodic job.
6. **Ranked runs have no dedicated exit.** After a run, "Return to Lobby"
   returns to a one-player lobby rather than back to `/ranking`.
7. **Leaving `/lobby/[code]` by navigating away never tells the server.** `room:leave`
   only fires from the explicit Disband/Leave buttons, so following a link out of
   the lobby keeps the socket connected and the player seated. The 10-minute
   abandoned-room sweep is now the safety net for this case. A client-side emit
   on `LobbyPage` unmount would close it properly, but React StrictMode's
   double-mount would eject the user from their own lobby, so it needs a
   deliberate fix rather than a silent one.
8. **`VITE_WS_URL` in the deployed web build is unverified.** The Cloudflare
   transport problem in §10 #13 was found by probing `api.frostespresso.site`
   directly; `app.frostespresso.site` was unreachable from the machine used for
   that investigation, so the URL the shipped bundle actually connects to has not
   been confirmed to be the API host. If it points anywhere else that is a
   separate failure.

---

## 12. Next plan

Ordered by value, not by effort.

### Near term

1. **Fix the host-settings wiring (gap 1).** Make `room:update_settings` nest
   Number Grid settings under `gameSettings`, or have `game.handler.ts` fall back
   to top-level settings. Until then the Number Grid settings card is
   decorative. Smallest correct change: read from both places in one place.
2. **Ranked exit.** After a ranked run, offer "View Ranking" and "Play Again"
   rather than returning to a solo lobby.
3. **Expose `gameSettings.variant` in the room state** so a client can tell a
   ranked room from a normal one without inferring it from the HUD.

### Medium term

4. **Seasons.** Add `season` to the read queries, create a new season row on a
   schedule, and snapshot the previous board. The schema is already generic for
   this; the work is queries and a job.
5. **Trophies.** Top 3 per board per season. Depends on 4.
6. **Play Streak.** A `HIGHER_IS_BETTER` board on a count of consecutive days
   with at least one ranked run. One `LEADERBOARD_DEFINITIONS` entry.
7. **More ranked games.** Once one more game has ranked modes, the generic
   page's value is proven; the Ranking page should then group by game category
   with a game selector.

### Housekeeping

8. Incremental rank recomputation (gap 5).
9. Reconcile Werewolf's role registry with its exposed settings (gap 3).
10. Replace the remaining `Math.random()` in board-size setup (gap 2).
