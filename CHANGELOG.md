# Changelog

## [1.1.0] - 2026-11-03

- Add **Matikanetannhauser** (Machitan / Mambo) as a second mascot: 11-line
  header portrait, 18-line full portrait, `tannhauser-turf` theme, and
  `/machitan`, `/mambo`, `/train`, `/mambo-fact` commands.
- Add Machitan persona levels: `flavor` (default), `mambo` (full roleplay), and
  `off`, cycled with `/machitan-mode`. No "Trainer" address.
- Add `/mascot` runtime switching plus persisted state in
  `~/.pi/agent/mascot-state.json`; theme auto-swap only between the two mascot
  palettes.
- Refactor the extension into a profile-driven host (`profiles.ts` + `state.ts`)
  with one shared header, plaque editor, footer, working indicator, and vim
  editor. Sanae's rendered output is unchanged.
- Add density-aware art coloring for Machitan so the full/empty-cell backdrop
  stays dim while the portrait stays bright.
