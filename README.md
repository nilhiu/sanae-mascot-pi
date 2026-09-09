# sanae-mascot-pi

A wind-priestess mascot for [pi](https://pi.dev), inspired by Sanae Kochiya (Touhou).
Braille portrait header, Moriya-shrine theme, plaque editor, shrine working
verbs, and a confident-newcomer temperament — with no roleplay: the agent
never names her or speaks as her.

## What's inside

- **Header** — 14-line slim braille portrait (all green) with an info panel,
  plus `/sanae`, `/miracle`, and `/pray` commands.
- **Theme `moriya-shrine`** — dark shrine palette: frog-green success (which
  colors the portrait), shrine-blue accent, lantern headings, thinking-level
  border gradient, curse-red bash mode.
- **Shrine chrome** — plaque editor + matching footer (see below).
- **Working verbs** — Claude-style `-ing` rotation, one verb per thought.
- **Temperament** — behavior-only prompt layer, unnamed, no roleplay.

## Preview

The default header (14-line slim portrait, all green, info panel on the right):

```
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

The plaque editor (`torii` = Nerd `fa-torii-gate` glyph, `❯` = U+276F):

```
────────────────── torii Faith Lv.3 · high
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

The theme is also selected automatically on first load if you set
`"theme": "moriya-shrine"` in `~/.pi/agent/settings.json`.

## Requirements

- A **Nerd Font** in your terminal. The torii-gate, frog, and prompt markers
  are Nerd Font glyphs (`fa-torii-gate`, `fa-frog`, U+276F); without one they
  show as boxes.
- Plain emoji (U+26E9, U+1F438, U+2728) is deliberately *not* used — it
  renders as tofu on systems with no emoji font.
- A font with Braille Patterns (U+2800 block) for the portrait.

## Theme

`themes/moriya-shrine.json` ships in the package and loads via the `pi.themes`
manifest entry, so installers get it with zero extra steps.

Design notes:

- `success` is frog green *on purpose* — the portrait art is colored with the
  `success` token, so this keeps Sanae green.
- Editor borders run moss → shrine blue → miracle cyan across thinking
  levels (`off` asleep … `max` miracle incoming); `bashMode` (`!` prefix) goes
  curse red.
- Headings and list bullets are lantern warm; inline code and types are
  miracle cyan.

## Shrine chrome

Enabled by default; `/sanae-editor` toggles shrine chrome ↔ stock box+footer.

**Plaque editor** (`CustomEditor` subclass, so app keys, autocomplete, and IME
cursor keep working):

- Top border is a right-aligned plaque: `torii Faith Lv.N · <thinking>`,
  with 2-cell right padding. Dashes use the thinking color; the label stays
  uncolored so it survives theme switches.
- First content line gets a `❯` gutter in the thinking color.
- No bottom border (the `↓ n more` scroll hint still appears on overflow).
- `editorPaddingX` 0–1 clamps to 2 while chrome is on — the gutter needs those
  columns for layout-stable rendering.

**Footer** is a faithful stock replica with one change: the right side shows
just the model (`(provider) model`), no `• thinking` — thinking already lives
in the plaque. Token stats, cost, context %, pwd/branch, and extension
statuses are unchanged. (Two known drifts vs stock, noted in code: the
`(auto)` compaction marker is always shown, and the `(sub)` marker only fires
for statically-known subscription providers.)

## Working verbs

While the agent streams, the working line shows one shrine verb per turn with
an animated `.` → `..` → `...` pulse, torii-prefixed, stock `Working` label
hidden:

> torii Gathering faith.. / Waving gohei.. / Purifying curses.. /
> Blessing code.. / Channeling wind.. / Offering prayers.. /
> Consulting gods.. / Chasing frogs.. / Shedding curses.. /
> Summoning miracles.. / Reading omikuji.. / Ringing bells.. /
> Sweeping shrine.. / Dispelling mist.. / Befriending snakes.. /
> Brewing miracles..

A fresh verb is picked on every `turn_start`. Edit `WORKING_VERBS` in
`extensions/sanae-mascot/index.ts` to taste.

## Commands

| Command         | What it does                                               |
|-----------------|------------------------------------------------------------|
| `/sanae [msg]`  | Summon the full 27-line portrait + shrine quote            |
| `/miracle <t>`  | Bless a task (compact portrait)                            |
| `/pray`         | Pray for the build/tests                                   |
| `/sanae-mode`   | Toggle the temperament layer (unnamed, no roleplay)        |
| `/sanae-header` | Cycle header: slim -> full -> mini -> off (never stock pi) |
| `/sanae-editor` | Toggle shrine chrome (plaque editor + footer) <-> stock    |

## Temperament

`sanae-mode` (on by default) injects a behavior-only prompt layer mapped from
her wiki personality - confident, energetic, dutiful newcomer energy with a
geeky streak - without naming any character, so the agent never LARPs. It
makes no identity claims (that caused precedence-think-loop artifacts), only
voice and work-habit guidance. The plaque tracks `Faith Lv.` per turn.

## Layout

```
extensions/sanae-mascot/   mascot, chrome, verbs, temperament
themes/moriya-shrine.json  shrine palette (pi.themes manifest entry)
```

## License

Public domain - see [UNLICENSE](UNLICENSE).
