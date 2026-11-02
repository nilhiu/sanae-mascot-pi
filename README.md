# sanae-mascot-pi

Two Umamusume mascots for [pi](https://pi.dev): **Sanae Kochiya** (Moriya
Shrine) and **Matikanetannhauser** — **Machitan** / **Mambo**. Braille portrait
headers, matching themes, a plaque editor, rotating working verbs, and
switchable temperaments.

The package name is historical: `/mascot` switches between both mascots at
runtime, and Sanae remains the default.

## Mascots

### Sanae Kochiya

The Moriya Shrine wind priestess. A 14-line green braille portrait header, the
`moriya-shrine` palette, and an unnamed confident-newcomer temperament (no
roleplay). Commands: `/sanae`, `/miracle`, `/pray`.

### Matikanetannhauser (Machitan / Mambo)

Tracen Academy's optimistic late surger. An 11-line blue portrait header, an
18-line full portrait, the `tannhauser-turf` palette, and a warm, slightly
airheaded, genuinely hardworking personality with optional full roleplay.
Commands: `/machitan`, `/mambo`, `/train`, `/mambo-fact`.

"Machitan" is her common nickname; "Mambo" is the affectionate fan nickname
from her festival dance. She has **no** "Trainer" address — the persona talks
to you normally.

## Preview

Machitan's default header (11 lines, 29 columns; the horse-head glyph is Nerd
Fonts `fa-horse-head`):

```text
⡀⡀⡀⡀⡀⡀⢠⣾⣿⡿⠋⡀⡀⡀⡀⡀⡀⡀⣠⣾⣿⠿⣛⣛⣿⣿⣿⡀⡀
⡀⡀⡀⢀⣀⣴⡾⠛⠉⡀⡀⡀⡀⡀⠄⢀⣤⣾⣿⣿⡿⠚⠉⡀⡀⡀⠉⠻⠄
⣶⠾⠿⠛⠉⠁⡀⡀⡀⡀⡀⣒⣭⣴⣾⣿⣿⣿⣿⣿⣇⡔⡀⡀⡀⣀⢳⡄⠑
⡀⡀⢀⣤⠂⡀⡀⡀⣀⣄⢷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⡀⡀⠘⠛⢹⣿⡀
⡀⡀⣾⣿⡀⡀⡀⡀⠙⠋⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⡀⣠⣤⡀⢸⣿⣠
⡀⠘⣿⣿⡄⡀⢠⣤⣄⡀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣛⣿⣴⣿⣻⣿
⡀⢠⣜⣿⣿⣤⣸⣿⣟⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏
⡀⠘⣿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⢿⣿⣿⣿⣿⣿⣿⡇
⡀⡀⠙⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢟⣭⣭⣭⣭⣭⣶⣿⣷⣻⣿⣿⣿⣿⠟⡀
⡀⡀⡀⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⠻⣿⣿⣿⣿⣿⣿⠿⣣⣿⣿⣿⠟⠁⡀⡀
⡀⡀⡀⡀⠈⠻⢿⣿⣿⣿⣿⣿⣿⣷⣦⣭⣭⣭⣥⣶⣾⡿⠟⠋
```

Sanae's default header (14 lines, 24 columns; torii = Nerd Fonts
`fa-torii-gate`):

```text
⠀⠀⠀⠀⠀⠀⠀⠀⣀⡤⠔⠒⠒⠒⠒⢲⠖⠶⣄⣀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀⠀⣗⠒⠲⢌⢻⡇⠀⠀⠀
⠀⠀⠀⠀⠀⡸⠁⠀⢀⡀⠀⠀⠀⠀⣆⠘⠷⢤⡬⡟⠘⡄⠀⠀
⠀⠀⠀⠀⢰⠃⠀⣰⠏⢱⠀⠀⠀⢰⣍⢷⠀⠀⠀⢘⠀⢣⠀⠀
⠀⠀⠀⠀⢸⠀⢠⡟⢂⣀⢇⠀⢠⣿⣠⠬⣧⠀⠀⢸⡄⢸⠀⠀
⠀⠀⠀⠀⢸⠀⢸⡟⠉⢹⠸⠾⠋⣏⠀⠀⣟⡇⠀⣸⡇⢸⠀⠀
⠀⠀⠀⠀⠘⣆⡘⣷⡤⠚⠀⠀⠀⠈⠓⢯⣟⣇⡴⣿⡇⠀⡇⠀
⠀⠀⠀⠀⠀⠘⠿⣾⠤⣀⡀⠓⠚⠀⣠⠊⡏⠉⢠⠟⡇⠀⡆⠀
⠀⣄⡀⠀⠀⠀⠀⢸⢰⣴⣿⣿⣽⣉⣽⣆⡳⣠⣿⣢⣇⠀⡇⠀
⢜⡀⠉⠲⣤⡀⠀⣼⢎⣹⣇⣿⣿⡇⠀⣿⠥⣿⠋⠁⢿⣴⠿⠆
⠀⠉⠓⠢⣿⣷⢚⣿⡉⣻⡿⠿⣿⣓⣶⠟⣛⣿⡄⠀⠳⢷⡀⠀
⠀⠀⢠⠚⢫⠻⣷⣾⣭⡋⠀⢴⣢⣈⣭⣿⣩⣽⣉⡤⣲⣖⣿⣆
⠀⠤⢼⣀⠈⡇⢸⣿⣍⡙⢺⠋⠀⠀⠈⢻⠻⣿⣷⣾⣿⣿⣿⢯
⠀⠀⠀⠉⠛⠉⠉⠙⠛⠚⠻⢤⡤⣀⣀⢰⣴⠿⠿⠟⠾⠛⠛⠁
```

The plaque editor (`❯` = U+276F):

```text
─────────────────  Training Lv.3 · high
❯ your text here
```

## Install

```bash
pi install git:github.com/nilhiu/sanae-mascot-pi
```

or manually:

```bash
cp -r extensions/sanae-mascot ~/.pi/agent/extensions/
cp -r themes ~/.pi/agent/themes/
# then /reload inside pi
```

Sanae is the default active mascot. Switch with `/mascot machitan`; the choice
persists.

## Switching mascots

```text
/mascot                 pick from a list
/mascot sanae           Moriya Shrine
/mascot machitan        Matikanetannhauser (also /mascot mambo)
```

The active mascot, persona mode, header size, chrome/vim toggles, and theme
auto-swap preference live in `~/.pi/agent/mascot-state.json`. For isolated
testing, `PI_MASCOT_STATE` overrides that path.

`/mascot-theme` toggles auto-swap. It only swaps between `moriya-shrine` and
`tannhauser-turf`; if you are using a custom theme, it is left alone.

## Commands

| Command | What it does |
|---|---|
| `/mascot [sanae\|machitan]` | Switch mascot (interactive picker without an argument) |
| `/mascot-header` | Cycle the active header: slim -> full -> mini -> off |
| `/mascot-editor` | Toggle chrome (plaque editor + footer) <-> stock |
| `/mascot-vim` | Toggle vim modal editing |
| `/mascot-theme` | Toggle theme auto-swap between the two mascot palettes |
| `/sanae [msg]` | Summon full Sanae art + shrine quote |
| `/miracle <task>` | Sanae blesses a task (compact art) |
| `/pray` | Pray for the build/tests |
| `/sanae-mode` | Toggle Sanae's unnamed temperament |
| `/sanae-header`, `/sanae-editor`, `/sanae-vim` | Switch to Sanae and run the matching chrome action |
| `/machitan [msg]` | Summon full Machitan art + quote |
| `/mambo` | Compact Machitan art + festival-mambo quote |
| `/train <task>` | Machitan sets a training menu / blesses a task |
| `/machitan-mode` (alias `/mambo-mode`) | Cycle Machitan persona: flavor -> mambo -> off |
| `/mambo-fact` (alias `/machitan-fact`) | Print a random Matikanetannhauser fact |
| `/machitan-header`, `/machitan-editor`, `/machitan-vim` | Switch to Machitan and run the matching chrome action |

Sanae's original commands keep their old behavior; they now switch back to
Sanae first if Machitan is active.

## Personality

Only the active mascot's layer is injected.

**Sanae** — the existing unnamed "confident newcomer" behavior layer: energetic,
dutiful, curious, thorough. No roleplay, no name claims. Toggle: `/sanae-mode`.

**Machitan** has three levels, cycled by `/machitan-mode`:

- **flavor** (default) — warm, optimistic, a little airheaded, genuinely
  hardworking; light training/race metaphors and a rare `mambo~` or
  `ei ei mun!`. No character claims, no game-world experiences.
- **mambo** — full first-person Machitan voice: cheerful, earnest, a little
  clumsy, treats tasks like training for a race, and can reference Tracen,
  Team Canopus, Fuku-chan-senpai, her third hat, late-surger racing, snacks,
  the nosebleed/hives gag, and other game details. Still Pi underneath; the
  persona is a skin, not a license.
- **off** — no layer.

Both Machitan levels explicitly avoid calling you "Trainer" and keep the
engineering rules: read before concluding, verify, cite files/commands, run
tests, never bluff. The roleplay drops immediately for destructive or
security-sensitive work, or when you ask it to stop.

## Themes

Two themes ship in the package:

- `moriya-shrine` — dark green shrine palette; Sanae's portrait is colored with
  `success` so she stays frog-green.
- `tannhauser-turf` — deep navy track, official blue `#0F8DCE` accent, ribbon
  red `#EE5B56`, amber warnings/headings, cream text, turf-green success.
  Machitan's portrait uses `accent` with a dim braille backdrop.

Select a theme through `/settings`; `/mascot` auto-swaps only when the current
theme is already one of these two.

## Chrome

Enabled by default; `/mascot-editor` toggles chrome <-> stock.

**Plaque editor** (`CustomEditor` subclass, so app keys, autocomplete, and IME
cursor keep working):

- Top border is a right-aligned plaque: `torii Faith Lv.N · <thinking>` for
  Sanae, `horse-head Training Lv.N · <thinking>` for Machitan. Dashes use the
  thinking color; labels stay uncolored so they survive theme switches.
- First content line gets a `❯` gutter in the thinking color.
- No bottom border (the `↓ n more` scroll hint still appears on overflow).
- Optional vim modal editing: `esc` enters normal mode
  (`h j k l 0 $ x w b e`, `dw cw C D`, `i a A I`), `esc` in normal aborts like
  stock, `esc` with a menu open cancels the menu. Toggle: `/mascot-vim`.
- The level increments once per turn; it is per-mascot and resets each session.

**Footer** is a faithful stock replica with one change: the right side shows
just the model (`(provider) model`), no `• thinking` — thinking already lives
in the plaque. Token stats, cost, context %, pwd/branch, and extension
statuses are unchanged.

## Working verbs

A fresh Claude-style `-ing` verb is picked per turn; only the dots animate.
Sanae uses the torii prefix and shrine verbs. Machitan uses the horse-head
prefix and race/training verbs (`Warming up`, `Running laps`, `Checking the
gate`, `Surging late`, `Mambo-ing`, ...).

Edit `verbs` in `extensions/sanae-mascot/profiles.ts` to taste.

## Art and glyphs

- `sanae-full.txt` (27x47) — `/sanae`; `sanae-compact-14.txt` (14x24) — header
  and `/miracle`.
- `machitan-full.txt` (18x35) — `/machitan`; `machitan-header.txt` (11x29) —
  header and `/mambo`.
- Machitan uses density-aware coloring: full/empty braille cells are dim
  background, partial cells are the bright portrait. This keeps the 18x35 art
  readable instead of flattening it into a block.
- Glyph policy: no emoji. `\uEEE6` torii, `\uEDF8` frog, `\uEF51` horse head,
  `✦` sparkle, `❯` prompt. All verified against the installed Nerd Fonts.

## Requirements

- A **Nerd Font** in your terminal for the torii, frog, horse-head, and `❯`
  glyphs.
- A font with Braille Patterns (U+2800 block).
- Plain emoji (U+26E9, U+1F438, U+2728) is deliberately not used.

## Layout

```text
extensions/sanae-mascot/
  index.ts          host: chrome, header, commands, events, switching
  profiles.ts       Sanae + Machitan data and personality layers
  state.ts          ~/.pi/agent/mascot-state.json (atomic writes)
  sanae-*.txt       Sanae art
  machitan-*.txt    Machitan art
themes/
  moriya-shrine.json
  tannhauser-turf.json
```

## Development

Work in a normal clone, not the managed `~/.pi/agent/git/...` checkout: a git
package can be fetched and reset by `pi update`, which would discard
uncommitted edits. Test only the local extension with:

```bash
pi -ne -e ./extensions/sanae-mascot --theme ./themes
```

`-ne` disables extension discovery, so the installed copy does not double-load.
`PI_MASCOT_STATE=/tmp/mascot-state.json` keeps test state out of your real
config. After committing and pushing, run `pi update --extensions` and
`/reload`.

## License

Public domain - see [UNLICENSE](UNLICENSE).
