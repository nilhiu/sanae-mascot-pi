# ⛩ sanae-mascot-pi

A wind-priestess mascot for [pi](https://pi.dev), inspired by Sanae Kochiya (Touhou).
Braille portrait header, shrine commands, and a confident-newcomer temperament -
with no roleplay: the agent never names her or speaks as her.

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

## Install

```bash
pi install git:github.com/nilhiu/sanae-mascot-pi
```

or manually:

```bash
cp -r extensions/sanae-mascot ~/.pi/agent/extensions/
# then /reload inside pi
```

## Requirements

- A **Nerd Font** in your terminal. The torii-gate and frog markers are Nerd
  Font glyphs (`fa-torii-gate`, `fa-frog`); without one they show as boxes.
  Plain emoji (⛩ 🐸 ✨) is deliberately *not* used - it renders as tofu on
  systems with no emoji font.
- A font with Braille Patterns (U+2800 block) for the portrait.

## Commands

| Command         | What it does                                               |
|-----------------|------------------------------------------------------------|
| `/sanae [msg]`  | Summon the full 27-line portrait + shrine quote            |
| `/miracle <t>`  | Bless a task (compact portrait)                            |
| `/pray`         | Pray for the build/tests                                   |
| `/sanae-mode`   | Toggle the temperament layer (unnamed, no roleplay)        |
| `/sanae-header` | Cycle header: slim -> full -> mini -> off (never stock pi) |

## Temperament

`sanae-mode` (on by default) injects a behavior-only prompt layer mapped from
her wiki personality - confident, energetic, dutiful newcomer energy with a
geeky streak - without naming any character, so the agent never LARPs. It
makes no identity claims (that caused precedence-think-loop artifacts), only
voice and work-habit guidance. The status line tracks `Faith Lv.` per turn.

## License

Public domain — see [UNLICENSE](UNLICENSE).
