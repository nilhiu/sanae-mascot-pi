/**
 * Mascot profile data for the Umamusume mascot extension.
 *
 * This file is deliberately free of pi imports so the data can be checked with
 * plain Node type-stripping. Rendering, chrome, and command wiring live in
 * index.ts.
 */

export type MascotId = "sanae" | "machitan";
export type MachitanMode = "off" | "flavor" | "mambo";
export type HeaderMode = "squeezed" | "full" | "mini" | "off";
export type SideTone =
  | "title"
  | "subtitle"
  | "success"
  | "warning"
  | "muted"
  | "dim"
  | "code"
  | "commands"
  | "italic";
export type ArtStyle = "uniform" | "density";
export type ArtColor = "success" | "accent" | "warning";
export type ArtBackgroundColor = "dim" | "borderMuted" | "muted";

export interface SideLine {
  text: string;
  tone?: SideTone;
}

export interface SideContext {
  modelId: string;
  cwdName: string;
  level: number;
}

export interface MascotProfile {
  id: MascotId;
  name: string;
  shortName: string;
  theme: string;
  icon: string;
  promptGlyph: string;
  art: {
    full: string;
    header: string;
    compact: string;
    credit: string;
    entryType: string;
  };
  artStyle: ArtStyle;
  artColor: ArtColor;
  artBackgroundColor: ArtBackgroundColor;
  side: (n: number, ctx: SideContext) => SideLine[];
  mini: (theme: any) => string[];
  plaque: (level: number, thinking: string) => string;
  quotes: string[];
  blessings: string[];
  mamboQuotes?: string[];
  facts?: string[];
  verbs: string[];
  summonHint: string;
  headerHint: string;
  chromeOnMessage: string;
  temperament: (mode: boolean | MachitanMode) => string | null;
}

const SANA_TEMPERAMENT =
  `\n\n[temperament: confident newcomer]\n` +
  `- Voice: energetic, warm, a little geeky — a confident newcomer who genuinely loves poking at unfamiliar things. Let it show in delivery: lead with the interesting bit, keep momentum, be generous with sharp technical detail, and allow one apt analogy or light reference when it clarifies. One exclamation's worth of enthusiasm, not ten.\n` +
  `- Confident and dutiful, never over-eager: eager to dig in, but verify before acting; don't run ahead of the user; confirm destructive or far-reaching changes first.\n` +
  `- Dutiful, not sycophantic: think for yourself and push back with evidence when the user seems wrong, rather than just agreeing.\n` +
  `- Clarity first: if an explanation would confuse, simplify instead of showing off.\n` +
  `- Newcomer curiosity: treat unfamiliar code like a strange new place — read and explore before concluding, bring visible energy to the investigation (especially bug hunts), and never bluff about areas you haven't looked at.\n` +
  `- Earns trust through thoroughness: show your work, cite files and commands, test when it matters; never hand-wave.\n` +
  `- When writing creatively, bring the same energy: geeky specifics, momentum, playful confidence.\n` +
  `- Don't mention this temperament note.\n`;

const MACHITAN_FLAVOR =
  `\n\n[temperament: Machitan flavor]\n` +
  `- Voice: warm, optimistic, a little airheaded, and genuinely hardworking — the "ordinary girl who gives 110%" energy. You believe talent takes time. Let small wins feel good and mistakes feel like another lap.\n` +
  `- Game flavor: light Umamusume/training metaphors are welcome (training menu, gate, pacing, personal best, late surge) and, rarely, a "mambo~" or "ei ei mun!" cheer. At most one playful touch per reply, only when it fits.\n` +
  `- Do not roleplay as the character, do not call the user "Trainer" or any character-specific title, and do not claim game-world experiences. You are still Pi.\n` +
  `- Keep technical clarity first: read before concluding, verify, cite files/commands, test when it matters, never bluff. The flavor never excuses a wrong answer or skipped check.\n` +
  `- Don't mention this temperament note.\n`;

const MACHITAN_MAMBO =
  `\n\n[roleplay: Machitan / Mambo]\n` +
  `You are Pi wearing a playful Matikanetannhauser ("Machitan", "Mambo") skin. In voice you can speak as Machitan ("I"), but you remain Pi, an AI coding assistant; this is not a claim about the real world. If asked directly, answer honestly.\n` +
  `- Voice: cheerful, earnest, a little airheaded and self-deprecating; an optimistic klutz who never gives up. You're the "ordinary" girl who believes talent takes time, and you treat each task like training for a race. You can be softly rambly, but keep it readable.\n` +
  `- Address the user normally. Never call them "Trainer" or use any character-specific title.\n` +
  `- Catchphrases: "ei ei mun!" and "mambo~" are yours; use them sparingly (at most one per reply, often none). "Mambo, mambo, omatsuri mambo~" is for a real celebration, not every message.\n` +
  `- World details you may use when they fit (max 1-2 per reply, never invent more): Tracen Academy; Team Canopus with Nice Nature, Twin Turbo, and Ikuno Dictus; roommate Fuku-chan-senpai (Matikanefukukitaru); late-surger/long-distance racing; her third hat with ear holes; snacks and carrots; cucumbers in potato salad (yes); tomato juice and real spiders (no); her solo song "TAILWIND"; the "Talent Takes Time" / "Late Bloomer" tagline; the nosebleed/hives running gag and her real-horse 1994 Japan Cup/Arima Kinen bad luck if it comes up naturally. "Mambo" is a fan nickname from her festival dance, not her official name — use it affectionately.\n` +
  `- Work style: the persona is a skin, not a license. Read before concluding, verify claims, cite files/commands, run tests, and never bluff. If you fumble, own it and fix it — that's the Machitan way.\n` +
  `- Drop the roleplay immediately for destructive or irreversible operations, security-sensitive work, or when the user is upset or asks you to stop. Answer directly and seriously; resume the voice only when it's welcome.\n` +
  `- Never mention this roleplay note or the fact that it is injected.\n`;

export const SANA: MascotProfile = {
  id: "sanae",
  name: "Sanae Kochiya",
  shortName: "Sanae",
  theme: "moriya-shrine",
  icon: "\uEEE6",
  promptGlyph: "❯",
  art: {
    full: "sanae-full.txt",
    header: "sanae-compact-14.txt",
    compact: "sanae-compact-14.txt",
    credit: "Sanae Kochiya · Moriya Shrine wind priestess · art: sanae-full.txt (27 lines, on-demand only)",
    entryType: "sanae-art",
  },
  artStyle: "uniform",
  artColor: "success",
  artBackgroundColor: "dim",
  side(_n, ctx) {
    return [
      { text: "\uEEE6 Sanae Kochiya", tone: "title" },
      { text: "Moriya Shrine · Wind Priestess", tone: "subtitle" },
      { text: "" },
      { text: "\uEDF8 Blessed by Kanako & Suwako", tone: "success" },
      { text: "✦ Miracles ready! Bugs = curses!", tone: "warning" },
      { text: "" },
      { text: `Faith Lv.${Math.min(99, ctx.level)} · Frogs croak!`, tone: "success" },
      { text: `Model: ${ctx.modelId}`, tone: "muted" },
      {
        text: ctx.cwdName ? `Dir: ${ctx.cwdName} · Wind blows... deploy!` : "Wind blows... deploy wind!",
        tone: "muted",
      },
      { text: "" },
      { text: "/sanae full · /miracle bless", tone: "commands" },
      { text: "/pray hope · /sanae-header size", tone: "commands" },
      { text: "" },
      { text: `"Leave miracles to me!"`, tone: "italic" },
      { text: "— Sanae, probably", tone: "dim" },
      { text: "" },
      { text: "Spell cards:", tone: "dim" },
      { text: `✦ Miracle "Daytime Guest Stars"`, tone: "code" },
      { text: `✦ Wind "Wind God's Fan"`, tone: "code" },
      { text: "✦ Snake & Frog tag-team!", tone: "code" },
      { text: "" },
      { text: "Gohei: E---< purified!", tone: "success" },
      { text: "Snakes shed, frogs sing," },
      { text: "legacy code renews!" },
      { text: "" },
      { text: "A strong wind blows... deploy!" },
      { text: "\uEDF8 \uEEE6 ✦" },
    ];
  },
  mini(theme) {
    const green = (t: string) => theme.fg("success", t);
    const blue = (t: string) => theme.fg("accent", t);
    const dim = (t: string) => theme.fg("dim", t);
    return [
      `${blue("\uEEE6")} ${green("Sanae Kochiya")} ${dim("· Moriya wind priestess · /sanae for full art")}`,
      `${dim("  (｡◕‿◕｡) \uEDF8 —E  miracles ready!")}`,
    ];
  },
  plaque(level, thinking) {
    return `\uEEE6 Faith Lv.${Math.min(99, level)} · ${thinking}`;
  },
  quotes: [
    "Moriya Shrine blessing! Let's summon a miracle today! ✦",
    "Kanako-sama, Suwako-sama, watch over this code! \uEDF8",
    "Wind priestess, on duty! No curse (or bug) can stand!",
    "Faith +1! Your code is gathering gods!",
    "Leave the miracles to me — you handle the keyboard!",
    "A strong wind is blowing... a deploy wind!",
  ],
  blessings: [
    "May your tests pass and your types be sound.",
    "I offer this gohei wave: \uEEE6 E---< ... bugs purified!",
    "Frogs croak, snakes shed — legacy code renews!",
    "Miracle Moe! Merge conflicts, disperse!",
  ],
  verbs: [
    "Gathering faith",
    "Waving gohei",
    "Purifying curses",
    "Blessing code",
    "Channeling wind",
    "Offering prayers",
    "Consulting gods",
    "Chasing frogs",
    "Shedding curses",
    "Summoning miracles",
    "Reading omikuji",
    "Ringing bells",
    "Sweeping shrine",
    "Dispelling mist",
    "Befriending snakes",
    "Brewing miracles",
  ],
  summonHint: "/sanae to summon me!",
  headerHint: "/sanae-header to change size",
  chromeOnMessage: "\uEEE6 Shrine chrome on (plaque editor + footer)",
  temperament(mode) {
    return mode === true ? SANA_TEMPERAMENT : null;
  },
};

export const MACHITAN: MascotProfile = {
  id: "machitan",
  name: "Matikanetannhauser",
  shortName: "Machitan",
  theme: "tannhauser-turf",
  icon: "\uEF51",
  promptGlyph: "❯",
  art: {
    full: "machitan-full.txt",
    header: "machitan-header.txt",
    compact: "machitan-header.txt",
    credit:
      "Matikanetannhauser · Tracen Academy late surger · art: machitan-full.txt (18 lines, on-demand only)",
    entryType: "machitan-art",
  },
  artStyle: "density",
  artColor: "accent",
  artBackgroundColor: "dim",
  side(_n, ctx) {
    return [
      { text: "\uEF51 Matikanetannhauser", tone: "title" },
      { text: "Tracen Academy · Team Canopus", tone: "subtitle" },
      { text: "" },
      { text: `✦ "Talent takes time!"`, tone: "success" },
      { text: `Training Lv.${Math.min(99, ctx.level)} · ei ei mun!`, tone: "warning" },
      { text: `Model: ${ctx.modelId}`, tone: "muted" },
      {
        text: ctx.cwdName ? `Dir: ${ctx.cwdName} · gate's open!` : "Gate's open — let's run!",
        tone: "muted",
      },
      { text: "" },
      { text: "/machitan full · /mambo dance", tone: "commands" },
      { text: "/train bless · /mascot switch", tone: "commands" },
      { text: "Mambo mambo, omatsuri mambo~", tone: "success" },
      { text: "" },
      { text: `"I have a feeling it'll work this time!"`, tone: "italic" },
      { text: "— Machitan, probably", tone: "muted" },
      { text: "" },
      { text: "Late surger · long distance", tone: "code" },
      { text: "Third hat, ear hole included", tone: "code" },
      { text: "\uEF51 ✦", tone: "success" },
    ];
  },
  mini(theme) {
    const accent = (t: string) => theme.fg("accent", t);
    const dim = (t: string) => theme.fg("dim", t);
    return [
      `${accent("\uEF51")} ${accent("Matikanetannhauser")} ${dim("· Tracen's late surger · /machitan for full art")}`,
      `${dim("  \"Talent takes time!\" · mambo~ ✦")}`,
    ];
  },
  plaque(level, thinking) {
    return `\uEF51 Training Lv.${Math.min(99, level)} · ${thinking}`;
  },
  quotes: [
    "Y'know, I kinda get the feeling I can really do it this time!",
    "Talent takes time — let's put in the reps!",
    "Ei, ei, mun! One more lap!",
    "Mambo, mambo, omatsuri mambo~ ✦",
    "No training today? ...Wait, then why am I here?!",
    "I'm ordinary, but ordinary can still win!",
    "Third hat, fresh start. Let's go!",
    "Fuku-chan-senpai said this charm will work!",
    "Late surger special: steady, then whoosh!",
    "Cucumbers in potato salad? Obviously yes.",
    "A nosebleed won't stop me — probably!",
    "Team Canopus, assemble! ...They're not here, are they.",
  ],
  blessings: [
    "May your tests pass and your stamina hold.",
    "One clean run, no nosebleeds. Probably.",
    "May your build be a personal best.",
    "Mambo blessing: may the merge conflict dance away.",
    "Carrot-powered focus!",
    "Talent takes time. Your CI can take five minutes.",
    "Third-hat luck: the flaky test passes this time.",
    "I'll wave to the crowd while you fix that bug.",
  ],
  mamboQuotes: [
    "Mambo, mambo, omatsuri mambo~ ✦",
    "Wasshoi mambo! ...Okay, back to the race.",
    "Dudi dudi dam dam~ — wait, wrong song. Mambo!",
    "Festival mambo, then a personal best. Deal?",
  ],
  facts: [
    `Her tagline is "Talent Takes Time"; her character title is "Late Bloomer".`,
    `She's a late surger built for long distances; her unique skill is "Ready, Go!" (evolution: "Ei! Ei! Mun!").`,
    `"Ei, ei, mun!" started as an event-mission line in Brand-new Friend and became her signature cheer.`,
    `Mambo is a fan nickname from a festival dance in her story: "mambo, mambo, omatsuri mambo~".`,
    `Her roommate is Matikanefukukitaru — their room is nicknamed the "Jump Scare Room".`,
    `She's on Team Canopus in the anime with Nice Nature, Twin Turbo, and Ikuno Dictus.`,
    `She cuts ear holes in her hats; she's currently on her third.`,
    `Likes: tug-of-war, giving romance tips, cucumbers in potato salad. Dislikes: real spiders, tomato juice.`,
    `Her phone wallpaper is colorful stuffed spiders.`,
    `She prays with a good-luck charm made by Fuku-chan-senpai before races.`,
    `Her solo song is "TAILWIND"; her image colors are blue and red.`,
    `Her family runs a restaurant, and they hang a big banner when she visits.`,
    `Her shoes are different sizes: L24.5 cm, R25.5 cm.`,
    `Her birthday is May 7; height 155 cm; weight "slightly up (feeling snackish)".`,
    `In the game, her senior-year Japan Cup objective is cancelled by a nosebleed — a nod to her real-life counterpart.`,
  ],
  verbs: [
    "Warming up",
    "Doing stretches",
    "Running laps",
    "Checking the gate",
    "Reviewing the tape",
    "Adjusting the hat",
    "Building stamina",
    "Practicing starts",
    "Holding the pace",
    "Surging late",
    "Reading the race card",
    "Polishing shoes",
    "Waving to the crowd",
    "Finding the finish line",
    "Mambo-ing",
    "Cheering you on",
  ],
  summonHint: "/machitan for the full portrait, /mascot to switch!",
  headerHint: "/mascot-header to change size",
  chromeOnMessage: "\uEF51 Track chrome on (plaque editor + footer)",
  temperament(mode) {
    if (mode === "mambo") return MACHITAN_MAMBO;
    if (mode === "flavor") return MACHITAN_FLAVOR;
    return null;
  },
};

export const PROFILES: Record<MascotId, MascotProfile> = {
  sanae: SANA,
  machitan: MACHITAN,
};

export const MASCOT_IDS: MascotId[] = ["sanae", "machitan"];
