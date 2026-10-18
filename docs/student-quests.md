# Student Quests

## Access

- `/student/register`: independent pupil account, no email or birth date required.
  A classroom invitation is optional. New logins use 3-32 ASCII letters, digits,
  underscore, hyphen or dot. Passwords require 8-128 characters.
- `/student/login`: separate from teacher access; existing pupil logins still work.
- `/student/dashboard`: nine bilingual quests across math, logic and science,
  achievements, XP, classroom homework and quizzes.
- `/student/class`: direct access to classroom tasks and joining by invite code.
- `/student/quests/:id`: saved campaign, four sequential stages per quest.
- `/student/history`: persisted quest progress and up to 100 submitted quizzes.
- `/quests`: teacher assignment, solution preview, own-class report and CSV export.
  Teachers can create a classroom code and copy a registration invitation here;
  no Telegram connection is needed. Existing codes are preserved.
- `/play`: existing classroom arena remains independent and supports guests.

## Rules And Storage

The curated question bank is in `server/data/quests.js`. It is not shipped to the
browser. Stages use numerical answers, single choice and keyboard-accessible
ordering controls. Server checks are deterministic; these quests do not require
an AI provider or spend teacher AI credits. They are practice, not exam grades.
Teachers should review suitability for their pupils before assigning them.

Each correct new stage earns 20 XP; finishing a quest adds 40 XP. Repeated answers,
concurrent requests and practice never grant duplicate XP. A write transaction
updates the stage and existing pupil XP/level together. There are no timeouts,
lives, purchases, advertising or punitive retry limits inside quests.

The next quest in each branch unlocks after completion. Teacher assignment can
open any quest in that class. Removing an assignment does not remove earned
progress or lock a quest already started. Awards are derived from saved progress.

Schema version `platform-21-quests` adds `quest_progress`, `quest_step_results`
and `quest_assignments`. Account/session middleware reloads current class
membership. A registered account may join a class once, but cannot move directly
between classes; its teacher must detach it first. Removing a registered pupil
from a class detaches the account. A database trigger also detaches registered
accounts before class deletion, preserving login and quest progress. Anonymous
roster rows retain legacy deletion behavior. Quest IDs/order/answers must not
be repurposed after publication; new curricula need new IDs.

## Reliability And Limits

- Correct answers/solutions are only returned to pupils after a correct check;
  teacher solution preview requires teacher authentication.
- Teacher reports are restricted to currently enrolled pupils of owned classes.
- Quest request bodies are limited to 4 KiB. Limits are 5,000/minute per IP and
  120/minute per pupil, separate from the legacy shared-IP API budget.
- Login attempts are limited per IP plus account, avoiding the old ten-pupils
  shared-IP lockout. The general API IP budget still applies to authentication.
- Client requests time out after 20 seconds; temporary failures preserve sessions.
  Repeating an ambiguous answer request is safe. Progress is fetched on return.
- Canvas animation runs only for a short progression transition and honors
  reduced-motion settings. There is no continuous game loop or external sprite
  download. Arena and quest lazy chunks each have a 64 KiB gzip budget, excluding
  shared React/application code and small shared icon modules.

## Verification Boundary

Native tests cover all 36 answers through HTTP, stage locks, answer privacy,
replay/concurrency, XP, class ownership, standalone registration, class deletion,
and 30 pupils registering/answering together with production rate limits. This
batch uses temporary local SQLite; it is not a Render/Turso capacity guarantee.
Playwright covers desktop/mobile registration, class joining, homework access,
all answer types, pixel content/movement, resume, history, teacher assignment,
CSV, 320px width, Kazakh login and session expiration.

Run `npm run lint`, `npm test`, `npm run build`, `npm run check:arena` and
`npm run test:e2e`. Real-school load, network reliability, curriculum approval,
and real AI-provider generation require separate acceptance testing.
