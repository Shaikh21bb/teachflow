# Bilim Arena

## Teacher and Student Flow

- Teacher: `/games`, create a match, select a saved quiz or the ready-made math
  quiz, or generate and review questions with AI. AI uses the existing quiz
  credit cost; creating and playing a room does not consume credits.
- Pupils: `/play` or the room link/QR, enter a nickname and join. Accounts are
  not required. Teams are balanced automatically, with a maximum of 40 pupils.
- Correct answer: 100 points and one manual attack. Three attack animations
  have the same damage. Executing the attack adds 20 points.
- Team health starts at 100 HP. Total possible damage per team per round is
  approximately 18 HP, normalized by team size in integer hundredths of HP.
  No speed bonus: a faster network does not earn additional answer points.
- Teacher controls: start, pause/resume, next question, end, remove a participant
  before starting, view results and export CSV. Completed matches stay in history.

## Reliability and Performance

SQLite/Turso holds the room, quiz snapshot, timer, players, answer ledger and
scores. Each answer/attack runs in a write transaction. One answer and one attack
per pupil per round are enforced server-side; client-supplied damage and scores
are ignored. Joining and room creation have retry keys. A pupil's reconnect
credential is stored locally, separate from teacher and student account tokens.

State polling is every approximately two seconds, with no overlapping requests,
backoff on network failures, and immediate retry on connectivity/visibility
changes. Hidden tabs stop polling and rendering. A 700 ms per-room snapshot
cache combines concurrent reads; it never replaces transactional persistence.
The last 40 strike events travel with snapshots and animate in a bounded queue,
so simultaneous classroom attacks do not collapse into a single last-hit frame.
Game polling has a separate rate limit because a school may share one public IP.
`GAME_IP_REQUEST_LIMIT` adjusts the IP polling budget (default 15,000 requests
per minute); join and action limits are scoped to IP plus room, not the school.
Correct options, teacher IDs and reconnect keys are not sent in public snapshots.

The canvas scene is original code-rendered pixel art with no remote image,
video, font or game-engine downloads. Rendering is capped near 30 FPS, respects
reduced motion and can be disabled. QR generation is an additional lazy import.
Game code/styles are lazy loaded; `npm run check:arena` enforces a 64 KiB gzip
budget for game-specific chunks including QR, excluding the shared React app.

Rooms accept joins for up to 24 hours. A started room locks new registrations,
but existing pupils can reconnect. A brief outage does not erase saved answers;
the game is not an offline application. Unsubmitted answers cannot be accepted
after their server deadline. If every device disconnects, reopening advances an
expired question once, rather than silently skipping the entire quiz.

## Verification

`npm test` includes permission checks, duplicate requests, pause/deadline races,
capacity, odd-team damage, replayed join keys, AI validation, a fresh-process
restart, and 30 simultaneous local clients answering/attacking followed by a
300-request snapshot burst. This is an isolated local SQLite test, not a claim
of cloud capacity or a real-school acceptance test.

`npm run test:e2e` checks desktop/mobile room creation, nickname joining, attacks,
canvas pixels and movement, offline recovery, refresh persistence, results and
CSV, AI review, and a 320 px join form. A renderer benchmark uses Chromium's 4x
CPU throttle; it is not a substitute for testing physical low-end devices.

AI tests use controlled responses, not production model calls. Before B2B launch,
run a supervised pilot on the school's actual devices and Wi-Fi, and load-test
the production hosting/database tier at the intended number of parallel classes.
