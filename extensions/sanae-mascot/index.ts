/**
 * Umamusume mascots for pi: Sanae Kochiya (Moriya Shrine) and
 * Matikanetannhauser (Machitan / Mambo).
 *
 * Glyph policy: this system has no emoji font, so use only glyphs verified with
 * `fc-list :charset=...` on the installed Nerd Fonts:
 * - \uEEE6 = Nerd fa-torii-gate (Sanae, 178 fonts)
 * - \uEDF8 = Nerd fa-frog (Sanae, 178 fonts)
 * - \uEF51 = Nerd fa-horse-head (Machitan, 178 fonts)
 * - ✦ (U+2726) sparkle, confirmed rendering by user
 * - ❯ (U+276F) prompt gutter, 422 fonts
 * Do not reintroduce emoji without checking coverage first.
 *
 * Art:
 * - Sanae: sanae-full.txt (27x47) via /sanae; sanae-compact-14.txt (14x24) header.
 * - Machitan: machitan-full.txt (18x35) via /machitan; machitan-header.txt (11x29)
 *   header. Machitan uses density-aware coloring: full/empty braille cells are
 *   dim background, partial cells are the bright portrait.
 *
 * Commands:
 *   /sanae [msg]       - summon full Sanae art + shrine quote
 *   /miracle <task>    - Sanae blesses your task (compact art)
 *   /pray              - pray for build/tests
 *   /sanae-mode        - toggle Sanae-inspired temperament (unnamed, no roleplay)
 *   /sanae-header      - cycle header: squeezed -> full -> mini -> off
 *   /sanae-editor      - toggle shrine chrome (plaque editor + footer): on -> stock
 *   /sanae-vim         - toggle vim modal editing in the plaque editor
 *   /machitan [msg]    - summon full Machitan art + quote
 *   /mambo             - compact Machitan art + festival-mambo quote
 *   /train <task>      - Machitan blesses your task (compact art)
 *   /machitan-mode     - cycle Machitan persona: flavor -> mambo -> off
 *   /mambo-fact        - print a random Matikanetannhauser fact
 *   /mascot [id]       - switch mascot: sanae | machitan (or pick from a list)
 *   /mascot-header     - cycle the active mascot's header
 *   /mascot-editor     - toggle chrome (plaque editor + footer) <-> stock
 *   /mascot-vim        - toggle vim modal editing
 *   /mascot-theme      - toggle mascot theme auto-swap
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, matchesKey, Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MACHITAN,
  PROFILES,
  SANA,
  type HeaderMode,
  type MachitanMode,
  type MascotId,
  type MascotProfile,
  type SideLine,
} from "./profiles";
import { loadMascotState, saveMascotState } from "./state";

interface MascotArtData {
  mascot?: MascotId;
  title: string;
  lines: string[];
  quote: string;
  timestamp: number;
}

// Prompt gutter glyph: ❯ (U+276F). Verified with `fc-list :charset=276F`
// (422 fonts, same family as Starship/powerlevel10k prompts). Width 1.
const PROMPT_GLYPH = "❯";

const HEADER_CYCLE: HeaderMode[] = ["squeezed", "full", "mini", "off"];

// Normal-mode key → escape/control sequence sent to the base editor.
// Only encodings verified end-to-end (arrows, ^A/^E, ^K, \x1b[3~ delete).
// Word motions (w e b dw cw) are NOT here: stock findWordForward stops ON
// whitespace and ESC-letter sends proved terminal-fragile, so those are
// computed from text+cursor below (true vim semantics) and stepped with
// arrows / forward-delete only.
const VIM_NORMAL_KEYS: Record<string, string> = {
  h: "\x1b[D", // left
  j: "\x1b[B", // down (older history at top)
  k: "\x1b[A", // up
  l: "\x1b[C", // right
  "0": "\x01", // line start
  $: "\x05", // line end
  x: "\x1b[3~", // delete char under cursor
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function setMascotWorkingVerb(ctx: any, icon: string, verb: string) {
  try {
    const theme = ctx.ui.theme;
    const base = `${icon} ${verb}`;
    ctx.ui.setWorkingIndicator({
      frames: [".", "..", "..."].map((d) => theme.fg("accent", `${base}${d}`)),
      intervalMs: 400,
    });
  } catch {
    // ignore — default spinner stays
  }
}

function applyWorkingIndicator(ctx: any, profile: MascotProfile) {
  // Hide the stock "Working" label; the verb frames carry the meaning.
  try {
    ctx.ui.setWorkingMessage("");
  } catch {
    // ignore
  }
  setMascotWorkingVerb(ctx, profile.icon, pick(profile.verbs));
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  if (n < 10000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${Math.round(n / 1000000)}M`;
}

function formatCwdForFooter(cwd: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) return cwd;
  const rel = relative(resolve(home), resolve(cwd));
  const inside = rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
  if (!inside) return cwd;
  return rel === "" ? "~" : `~${sep}${rel}`;
}

function sanitizeStatusText(text: string): string {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

// --- true vim word motions ---------------------------------------------
// Words = runs of word chars ([\p{L}\p{N}_]) or runs of punctuation;
// whitespace (incl. newlines) separates. Positions are UTF-16 offsets from
// code-point iteration, so surrogate pairs are never split.
type VimPos = { line: number; col: number };

function vimCharClass(ch: string): "w" | "p" | "s" {
  if (/\s/.test(ch)) return "s";
  return /[\p{L}\p{N}_]/u.test(ch) ? "w" : "p";
}

function vimRuns(line: string): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  const chars = [...line];
  let off = 0, i = 0;
  while (i < chars.length) {
    const cls = vimCharClass(chars[i]!);
    const len = chars[i]!.length;
    if (cls === "s") {
      off += len;
      i++;
      continue;
    }
    const start = off;
    let end = off;
    while (i < chars.length && vimCharClass(chars[i]!) === cls) {
      end = off;
      off += chars[i]!.length;
      i++;
    }
    runs.push({ start, end });
  }
  return runs;
}

function countGraphemes(s: string): number {
  try {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].length;
  } catch {
    return [...s].length;
  }
}

// Stock footer replica minus the `model • thinking` suffix (thinking lives in
// the plaque now). Mirrors pi's FooterComponent: pwd line, token stats line
// with right-aligned model, extension statuses line. Two known drifts vs
// stock: the "(auto)" compaction marker is always shown (flag not exposed
// to extensions; matches the default setting), and the subscription "(sub)"
// marker only triggers for subscription-backed providers known statically.
function renderMascotFooter(width: number, ctx: any, theme: any, footerData: any): string[] {
  let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, cost = 0;
  let latestCacheHitRate: number | undefined;
  for (const e of ctx.sessionManager.getEntries()) {
    try {
      if (e.type === "message" && e.message?.role === "assistant" && e.message.usage) {
        const u = e.message.usage;
        input += u.input ?? 0; output += u.output ?? 0;
        cacheRead += u.cacheRead ?? 0; cacheWrite += u.cacheWrite ?? 0;
        cost += u.cost?.total ?? 0;
        const latestPrompt = (u.input ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0);
        latestCacheHitRate = latestPrompt > 0 ? ((u.cacheRead ?? 0) / latestPrompt) * 100 : undefined;
      } else if (e.type === "message" && e.message?.role === "toolResult" && e.message.usage) {
        const u = e.message.usage;
        input += u.input ?? 0; output += u.output ?? 0;
        cacheRead += u.cacheRead ?? 0; cacheWrite += u.cacheWrite ?? 0;
        cost += u.cost?.total ?? 0;
      } else if ((e.type === "branch_summary" || e.type === "compaction") && e.usage) {
        const u = e.usage;
        input += u.input ?? 0; output += u.output ?? 0;
        cacheRead += u.cacheRead ?? 0; cacheWrite += u.cacheWrite ?? 0;
        cost += u.cost?.total ?? 0;
      }
    } catch {
      // skip malformed entries
    }
  }

  let contextWindow = ctx.model?.contextWindow ?? 0;
  let contextPercent = "?";
  let contextPercentValue = 0;
  try {
    const cu = ctx.getContextUsage?.();
    if (cu) {
      contextWindow = cu.contextWindow ?? contextWindow;
      if (cu.percent !== null && cu.percent !== undefined) {
        contextPercentValue = cu.percent;
        contextPercent = cu.percent.toFixed(1);
      }
    }
  } catch {
    // unknown until next LLM response
  }

  let pwd = formatCwdForFooter(ctx.sessionManager.getCwd());
  try {
    const branch = footerData.getGitBranch();
    if (branch) pwd = `${pwd} (${branch})`;
  } catch {
    // no git info
  }
  try {
    const sessionName = ctx.sessionManager.getSessionName();
    if (sessionName) pwd = `${pwd} • ${sessionName}`;
  } catch {
    // unnamed session
  }

  const statsParts: string[] = [];
  if (input) statsParts.push(`↑${formatTokens(input)}`);
  if (output) statsParts.push(`↓${formatTokens(output)}`);
  if (cacheRead) statsParts.push(`R${formatTokens(cacheRead)}`);
  if (cacheWrite) statsParts.push(`W${formatTokens(cacheWrite)}`);
  if ((cacheRead > 0 || cacheWrite > 0) && latestCacheHitRate !== undefined) {
    statsParts.push(`CH${latestCacheHitRate.toFixed(1)}%`);
  }
  const provider: string | undefined = ctx.model?.provider;
  const usingSubscription = provider === "kimi-coding" || provider === "kimi-for-coding";
  if (cost || usingSubscription) {
    statsParts.push(`$${cost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);
  }
  const contextDisplay = `${contextPercent}%/${formatTokens(contextWindow)} (auto)`;
  if (contextPercentValue > 90) statsParts.push(theme.fg("error", contextDisplay));
  else if (contextPercentValue > 70) statsParts.push(theme.fg("warning", contextDisplay));
  else statsParts.push(contextDisplay);

  let statsLeft = statsParts.join(" ");
  let statsLeftWidth = visibleWidth(statsLeft);
  if (statsLeftWidth > width) {
    statsLeft = truncateToWidth(statsLeft, width, "...");
    statsLeftWidth = visibleWidth(statsLeft);
  }

  // Right side: model only — no thinking level (it lives in the plaque).
  const modelName: string = ctx.model?.id || "no-model";
  let rightSide = modelName;
  try {
    if (footerData.getAvailableProviderCount() > 1 && ctx.model && provider) {
      const withProvider = `(${provider}) ${modelName}`;
      if (statsLeftWidth + 2 + visibleWidth(withProvider) <= width) rightSide = withProvider;
    }
  } catch {
    // provider count unavailable
  }
  const rightSideWidth = visibleWidth(rightSide);
  let statsLine: string;
  if (statsLeftWidth + 2 + rightSideWidth <= width) {
    statsLine = statsLeft + " ".repeat(width - statsLeftWidth - rightSideWidth) + rightSide;
  } else {
    const avail = width - statsLeftWidth - 2;
    if (avail > 0) {
      const tr = truncateToWidth(rightSide, avail, "");
      statsLine = statsLeft + " ".repeat(Math.max(0, width - statsLeftWidth - visibleWidth(tr))) + tr;
    } else {
      statsLine = statsLeft;
    }
  }

  const dimStatsLeft = theme.fg("dim", statsLeft);
  const dimRemainder = theme.fg("dim", statsLine.slice(statsLeft.length));
  const lines = [
    truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "...")),
    dimStatsLeft + dimRemainder,
  ];
  try {
    const statuses: ReadonlyMap<string, string> = footerData.getExtensionStatuses();
    if (statuses.size > 0) {
      const line = Array.from(statuses.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, text]) => sanitizeStatusText(text))
        .join(" ");
      lines.push(truncateToWidth(line, width, theme.fg("dim", "...")));
    }
  } catch {
    // no extension statuses
  }
  return lines;
}

function applyMascotFooter(ctx: any) {
  if (!ctx.hasUI) return;
  ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
    const unsub = footerData.onBranchChange(() => tui.requestRender());
    return {
      dispose: unsub,
      invalidate() {},
      render(width: number): string[] {
        try {
          return renderMascotFooter(width, ctx, theme, footerData);
        } catch {
          return [];
        }
      },
    };
  });
}

function loadArtFile(name: string): string[] | null {
  const candidates: string[] = [];
  try {
    // @ts-ignore - jiti supports import.meta.url
    const here = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(here, name));
  } catch {
    // ignore
  }
  candidates.push(join(homedir(), `.pi/agent/extensions/sanae-mascot/${name}`));
  candidates.push(join(process.cwd(), `.pi/extensions/sanae-mascot/${name}`));

  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const raw = readFileSync(p, "utf8").replace(/\r/g, "");
        const lines = raw.split("\n");
        if (lines.length && lines[lines.length - 1] === "") lines.pop();
        if (lines.length > 3) return lines;
      }
    } catch {
      // try next
    }
  }
  return null;
}

function loadFullArt(profile: MascotProfile): string[] {
  const art = loadArtFile(profile.art.full) ?? loadArtFile(profile.art.header);
  if (art) return art;
  if (profile.id === "sanae") {
    return [
      "  \uEEE6  Sanae Kochiya",
      "   (｡◕‿◕｡)  \uEDF8",
      "   E---< gohei!",
    ];
  }
  return [
    `  ${profile.icon}  ${profile.name}`,
    `   "Talent takes time!"`,
    `   mambo~ ✦`,
  ];
}

// Header art: slim squeeze reads much better than the wide full portrait.
// Falls back to the full art if the slim file is missing.
function loadHeaderArt(profile: MascotProfile): string[] {
  return loadArtFile(profile.art.header) ?? loadFullArt(profile);
}

function loadCompactArt(profile: MascotProfile): string[] {
  return loadArtFile(profile.art.compact) ?? loadFullArt(profile);
}

// Machitan's source art uses full braille cells (⣿) or sparse background
// cells (⡀) as a backdrop. Coloring every cell the same would flatten the
// portrait into a block, so group runs: background-like cells go dim, the
// partial cells that form the character stay bright.
function colorDensityLine(
  line: string,
  theme: any,
  bright: string,
  dim: string,
): string {
  if (!line) return "";
  let out = "";
  let run = "";
  let runDim = false;
  const flush = () => {
    if (!run) return;
    out += theme.fg(runDim ? dim : bright, run);
    run = "";
  };
  for (const ch of line) {
    const cp = ch.codePointAt(0) ?? 0;
    let isDim = false;
    if (cp >= 0x2800 && cp <= 0x28ff) {
      let bits = cp - 0x2800;
      let pop = 0;
      for (; bits; bits &= bits - 1) pop++;
      isDim = pop <= 1 || pop >= 8;
    } else if (ch === " ") {
      isDim = true;
    }
    if (run && isDim !== runDim) flush();
    runDim = isDim;
    run += ch;
  }
  flush();
  return out;
}

function colorArtLine(profile: MascotProfile, line: string, theme: any): string {
  if (profile.artStyle === "uniform") return theme.fg(profile.artColor, line);
  return colorDensityLine(line, theme, profile.artColor, profile.artBackgroundColor);
}

function renderSideLine(line: SideLine | undefined, theme: any): string {
  if (!line || !line.text) return "";
  const text = line.text;
  switch (line.tone) {
    case "title":
      return theme.bold(theme.fg("accent", text));
    case "subtitle":
      return theme.fg("dim", text);
    case "success":
      return theme.fg("success", text);
    case "warning":
      return theme.fg("warning", text);
    case "muted":
      return theme.fg("muted", text);
    case "code":
      return theme.fg("mdCode", text);
    case "italic":
      return theme.italic ? theme.italic(theme.fg("muted", text)) : theme.fg("muted", text);
    case "commands":
      // highlight /commands in accent
      return text
        .split(" ")
        .map((w) => (w.startsWith("/") ? theme.fg("accent", w) : theme.fg("dim", w)))
        .join(" ");
    case "dim":
    default:
      return theme.fg("dim", text);
  }
}

function buildSide(
  profile: MascotProfile,
  n: number,
  ctx: any,
  level: number,
): SideLine[] {
  const modelId: string = ctx?.model?.id ?? ctx?.model?.name ?? "no-model";
  let cwdName = "";
  try {
    const parts = String(ctx?.cwd ?? "").split("/").filter(Boolean);
    cwdName = parts.length ? parts[parts.length - 1]! : "";
  } catch {
    // ignore
  }
  const side = profile.side(n, { modelId, cwdName, level });
  if (side.length >= n) return side.slice(0, n);
  return [...side, ...Array.from({ length: n - side.length }, () => ({ text: "" }))];
}

function renderArtEntry(
  entry: any,
  { expanded }: { expanded: boolean },
  theme: any,
) {
  const data: MascotArtData = entry.data ?? {
    mascot: "sanae",
    title: "Sanae",
    lines: [],
    quote: "",
    timestamp: Date.now(),
  };
  const profile = PROFILES[data.mascot ?? "sanae"];
  const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
  box.addChild(
    new Text(
      `${theme.fg("accent", profile.icon + " " + data.title)}  ${theme.fg(
        "dim",
        new Date(data.timestamp ?? Date.now()).toLocaleTimeString(),
      )}`,
      0,
      0,
    ),
  );
  // Braille art: Sanae stays uncolored for shape fidelity; Machitan's source
  // art has a full/empty-cell backdrop, so it must use the density colorer in
  // the transcript too or the backdrop becomes a solid foreground block.
  for (const line of data.lines) {
    box.addChild(new Text(profile.artStyle === "density" ? colorArtLine(profile, line, theme) : line, 0, 0));
  }
  box.addChild(new Text(theme.fg("success", `✦ ${data.quote}`), 0, 0));
  if (expanded) {
    box.addChild(new Text(theme.fg("dim", profile.art.credit), 0, 0));
  }
  return box;
}

export default function umaMascot(pi: ExtensionAPI) {
  const initialState = loadMascotState();
  let activeId: MascotId = initialState.active;
  let sanaeMode = initialState.sanaeMode;
  let machitanMode: MachitanMode = initialState.machitanMode;
  // You're right: header scrolls away with transcript, so big art is fine.
  // Cycle: slim (default) -> full -> mini (2 lines) -> off
  let headerMode: HeaderMode = initialState.headerMode;
  let plaqueOn = initialState.chrome;
  let vimOn = initialState.vim;
  let autoTheme = initialState.autoTheme;
  const levels: Record<MascotId, number> = { sanae: 0, machitan: 0 };
  let thinkingLabel = "medium";
  let tuiRef: any = null;
  let plaqueEd: PlaqueEditor | null = null;

  const profile = (): MascotProfile => PROFILES[activeId];

  const save = () =>
    saveMascotState({
      active: activeId,
      sanaeMode,
      machitanMode,
      headerMode,
      chrome: plaqueOn,
      vim: vimOn,
      autoTheme,
    });

  // Minimal themed editor: plaque top border (mode tag left, mascot level +
  // thinking right, thinking-colored dashes), colored Nerd prompt gutter on
  // the first content line, no bottom border. Optional vim modal editing
  // (toggle: /mascot-vim). Extends CustomEditor so app keys (escape to abort,
  // ctrl+d, model switching, autocomplete, IME cursor) keep working. Labels
  // stay uncolored (terminal default) so they survive theme switches; dashes
  // and gutter use borderColor so thinking/bash recolors apply automatically.
  class PlaqueEditor extends CustomEditor {
    public getPlaque: () => string = () => "";
    public vimOn = true;
    public vimMode: "normal" | "insert" = "insert";
    private pendingOp: "d" | "c" | null = null;
    // Live theme proxy (always current, survives /settings switches and
    // hot-reload): use for mode-tag colors. Dashes/gutter keep borderColor.
    public fullTheme: any = null;
    private paint(color: string, s: string): string {
      try {
        return this.fullTheme?.fg?.(color, s) ?? s;
      } catch {
        return s;
      }
    }
    // The app syncs paddingX from settings (default 0) after the factory
    // runs; floor it so the 2-col gutter always has reserved layout space.
    // Without this the gutter overflows the laid-out width and the terminal
    // hard-wraps the line (gutter vanishes, wrap point shifts).
    override setPaddingX(p: number): void {
      super.setPaddingX(Math.max(p, 2));
    }
    private flatAbs(lines: string[], p: VimPos): number {
      let n = 0;
      for (let l = 0; l < p.line; l++) n += (lines[l] ?? "").length + 1;
      return n + p.col;
    }
    // w = next word start, e = next word end (strictly after cursor, so e on
    // a word end advances), b = previous word start. Cross lines; null when
    // no target (vim bell == do nothing).
    private vimTarget(kind: "w" | "e" | "b"): VimPos | null {
      const lines = this.getLines();
      const cur = this.getCursor();
      const after = (l: number, c: number) => l > cur.line || (l === cur.line && c > cur.col);
      const before = (l: number, c: number) => l < cur.line || (l === cur.line && c < cur.col);
      if (kind === "b") {
        for (let l = cur.line; l >= 0; l--) {
          const runs = vimRuns(lines[l] ?? "");
          for (let r = runs.length - 1; r >= 0; r--) {
            if (before(l, runs[r]!.start)) return { line: l, col: runs[r]!.start };
          }
        }
        return null;
      }
      for (let l = cur.line; l < lines.length; l++) {
        for (const r of vimRuns(lines[l] ?? "")) {
          const c = kind === "w" ? r.start : r.end;
          if (after(l, c)) return { line: l, col: c };
        }
      }
      return null;
    }
    // Step with arrows only (verified primitive; left/right cross logical
    // lines). Targets are grapheme starts so no step overshoots; capped.
    private stepTo(t: VimPos): void {
      for (let i = 0; i < 2000; i++) {
        const c = this.getCursor();
        if (c.line === t.line && c.col === t.col) return;
        const fwd = c.line < t.line || (c.line === t.line && c.col < t.col);
        super.handleInput(fwd ? "\x1b[C" : "\x1b[D");
      }
    }
    // True vim dw: delete [cursor, w-target) in flat graphemes (forward-
    // delete joins lines at EOL, so cross-line spans work). No target → kill
    // to end of line; at buffer end → nothing.
    private vimDeleteToWord(): void {
      const lines = this.getLines();
      const cur = this.getCursor();
      const t = this.vimTarget("w");
      let range: string;
      if (!t) {
        range = (lines[cur.line] ?? "").slice(cur.col);
      } else {
        const flat = lines.join("\n");
        range = flat.slice(this.flatAbs(lines, cur), this.flatAbs(lines, t));
      }
      const n = countGraphemes(range);
      for (let i = 0; i < n; i++) super.handleInput("\x1b[3~");
    }
    handleInput(data: string): void {
      if (!this.vimOn) {
        super.handleInput(data);
        return;
      }
      if (this.vimMode === "insert") {
        // Escape enters normal mode — unless a menu is open, where it
        // cancels autocomplete like stock.
        if (matchesKey(data, "escape") && !this.isShowingAutocomplete()) {
          this.vimMode = "normal";
          this.tui.requestRender();
          return;
        }
        super.handleInput(data);
        return;
      }
      // Operator-pending: d/c followed by w resolves dw/cw. Escape cancels
      // the operator (does NOT abort the agent); anything else cancels it
      // and processes as a fresh normal-mode key.
      if (this.pendingOp) {
        const op = this.pendingOp;
        this.pendingOp = null;
        if (matchesKey(data, "escape")) {
          this.tui.requestRender();
          return;
        }
        if (data === "w" && (op === "d" || op === "c")) {
          this.vimDeleteToWord();
          if (op === "c") this.vimMode = "insert";
          this.tui.requestRender();
          return;
        }
      }
      // Normal mode: escape aborts the agent (stock behavior).
      if (matchesKey(data, "escape")) {
        super.handleInput(data);
        return;
      }
      if (data === "i") {
        this.vimMode = "insert";
        this.tui.requestRender();
        return;
      }
      if (data === "a") {
        this.vimMode = "insert";
        super.handleInput("\x1b[C"); // step right, then insert
        this.tui.requestRender();
        return;
      }
      if (data === "A") {
        this.vimMode = "insert";
        super.handleInput("\x05"); // line end, then insert
        this.tui.requestRender();
        return;
      }
      if (data === "I") {
        this.vimMode = "insert";
        super.handleInput("\x01"); // line start, then insert
        this.tui.requestRender();
        return;
      }
      if (data === "d" || data === "c") {
        this.pendingOp = data; // resolved by the next key (dw/cw)
        return;
      }
      if (data === "D") {
        super.handleInput("\x0b"); // delete-to-line-end (default ctrl+k)
        return;
      }
      if (data === "C") {
        super.handleInput("\x0b"); // kill to end, then insert
        this.vimMode = "insert";
        this.tui.requestRender();
        return;
      }
      const seq = VIM_NORMAL_KEYS[data];
      if (seq) {
        super.handleInput(seq);
        return;
      }
      if (data === "w" || data === "e" || data === "b") {
        const t = this.vimTarget(data);
        if (t) {
          this.stepTo(t);
          this.tui.requestRender();
        }
        return;
      }
      // Swallow printable chars in normal mode; control sequences
      // (ctrl+c, ctrl+g, ...) still reach the app.
      if (data.length === 1 && data.charCodeAt(0) >= 32) return;
      super.handleInput(data);
    }
    protected renderTopBorder(width: number, hiddenLineCount: number): string {
      if (hiddenLineCount > 0) return super.renderTopBorder(width, hiddenLineCount);
      const plaque = this.getPlaque();
      if (!this.vimOn) {
        const lw = visibleWidth(plaque);
        if (lw + 3 > width) return this.borderColor(truncateToWidth(plaque, width));
        return this.borderColor("─".repeat(width - lw - 3) + " ") + plaque + "  ";
      }
      const isNormal = this.vimMode === "normal";
      const leftLabel = ` ${this.paint(isNormal ? "accent" : "success", isNormal ? "NORMAL" : "INSERT")} `;
      const rightLabel = ` ${plaque}  `;
      const used = visibleWidth(leftLabel) + visibleWidth(rightLabel);
      if (used + 1 > width) {
        return this.borderColor(truncateToWidth(`${leftLabel.trim()} ${plaque}`, width));
      }
      return leftLabel + this.borderColor("─".repeat(width - used)) + rightLabel;
    }
    protected renderBottomBorder(width: number, linesBelow: number): string {
      // No bottom chrome; keep the scroll indicator when content overflows.
      if (linesBelow > 0) return super.renderBottomBorder(width, linesBelow);
      return "";
    }
    render(width: number): string[] {
      const lines = super.render(width);
      const contentCount = (this as any).renderedVisibleLineCount ?? 0;
      if (contentCount <= 0) return lines;
      // Drop the empty bottom border line (index 1 + contentCount).
      const bi = 1 + contentCount;
      if (lines[bi] === "") lines.splice(bi, 1);
      // Gutter: swap the 2 reserved leading padding cols for glyph + space.
      // Same visible width, so cursor math and wrapping are unaffected.
      // (Padding is floored at 2 above, so the prefix is always present
      // except on extremely narrow terminals where the layout clamps it.)
      if (lines.length > 1) {
        const first = lines[1] ?? "";
        if (first.startsWith("  ")) {
          lines[1] = this.borderColor(PROMPT_GLYPH) + " " + first.slice(2);
        }
      }
      return lines;
    }
  }

  function applyMascotChrome(ctx: any) {
    if (!ctx.hasUI) return;
    ctx.ui.setEditorComponent((tui: any, theme: any, kb: any) => {
      tuiRef = tui;
      const ed = new PlaqueEditor(tui, theme, kb);
      ed.vimOn = vimOn;
      ed.fullTheme = ctx.ui.theme;
      ed.getPlaque = () => profile().plaque(levels[activeId], thinkingLabel);
      plaqueEd = ed;
      return ed;
    });
    applyMascotFooter(ctx);
  }

  function restoreStockChrome(ctx: any) {
    ctx.ui.setEditorComponent(undefined);
    ctx.ui.setFooter(undefined);
  }

  function maybeSwitchTheme(ctx: any, id: MascotId): boolean {
    if (!autoTheme) return false;
    try {
      const current = pi.getSettings()?.theme;
      // Only swap between the two mascot palettes. A custom/stock theme is the
      // user's choice and must never be clobbered by a mascot switch.
      if (current !== "moriya-shrine" && current !== "tannhauser-turf") return false;
      const target = PROFILES[id].theme;
      if (current === target) return false;
      const result = ctx.ui.setTheme(target);
      if (result?.success) return true;
      ctx.ui.notify(`Theme ${target} unavailable: ${result?.error ?? "unknown"}`, "warning");
    } catch {
      // ignore
    }
    return false;
  }

  function switchTo(id: MascotId, ctx: any) {
    const changed = activeId !== id;
    activeId = id;
    if (changed) save();
    const themeChanged = maybeSwitchTheme(ctx, id);
    if (!changed && !themeChanged) return;
    applyHeader(ctx);
    if (plaqueOn) applyMascotChrome(ctx);
    applyWorkingIndicator(ctx, profile());
    try {
      tuiRef?.requestRender();
    } catch {
      // ignore
    }
  }

  function applyHeader(ctx: any) {
    if (ctx.mode !== "tui") return;
    if (headerMode === "off") {
      // Empty custom header — NOT setHeader(undefined), which would restore
      // the stock pi header. This keeps it truly headerless, including when
      // the persisted state starts in "off".
      ctx.ui.setHeader(() => ({ invalidate() {}, render: (_w: number) => [] }));
      return;
    }
    const p = profile();
    ctx.ui.setHeader((_tui: any, theme: any) => ({
      invalidate() {},
      render(width: number): string[] {
        const out: string[] = [];
        if (headerMode === "mini") {
          for (const line of p.mini(theme)) out.push(truncateToWidth(line, width));
          return out;
        }
        const rawArt = headerMode === "full" ? loadFullArt(p) : loadHeaderArt(p);
        const n = rawArt.length;
        const artW = Math.max(10, ...rawArt.map((l) => visibleWidth(l)));
        const gap = "  ";
        const side = buildSide(p, n, ctx, levels[activeId]);
        const minSide = 22;
        // Narrow terminal? Stack instead of side-by-side.
        if (width < artW + gap.length + minSide) {
          rawArt.forEach((line) => out.push(truncateToWidth(colorArtLine(p, line, theme), width)));
          out.push(truncateToWidth(theme.fg("dim", `${p.icon} ${p.name} · ${p.headerHint}`), width));
          return out;
        }
        const sideW = width - artW - gap.length;
        for (let i = 0; i < n; i++) {
          const rawLeft = rawArt[i] ?? "";
          const pad = Math.max(0, artW - visibleWidth(rawLeft));
          const left = colorArtLine(p, rawLeft, theme) + " ".repeat(pad);
          const right = truncateToWidth(renderSideLine(side[i], theme), sideW);
          out.push(left + gap + right);
        }
        return out;
      },
    }));
  }

  function cycleHeader(ctx: any) {
    const idx = HEADER_CYCLE.indexOf(headerMode);
    headerMode = HEADER_CYCLE[(idx + 1) % HEADER_CYCLE.length]!;
    save();
    if (headerMode === "off") {
      ctx.ui.setHeader(() => ({ invalidate() {}, render: (_w: number) => [] }));
      ctx.ui.notify("Header hidden (stock pi header stays off too)", "info");
      return;
    }
    applyHeader(ctx);
    const p = profile();
    const size =
      headerMode === "full"
        ? `${loadFullArt(p).length} lines (full)`
        : headerMode === "squeezed"
          ? `${loadHeaderArt(p).length} lines (${p.id === "sanae" ? "slim green" : "slim blue"})`
          : "mini (2 lines)";
    ctx.ui.notify(`${p.icon} ${p.shortName} header: ${size}`, "info");
  }

  function toggleChrome(ctx: any) {
    plaqueOn = !plaqueOn;
    save();
    if (!plaqueOn) {
      restoreStockChrome(ctx);
      ctx.ui.notify("Stock editor + footer restored", "info");
    } else {
      applyMascotChrome(ctx);
      ctx.ui.notify(profile().chromeOnMessage, "info");
    }
  }

  function toggleVim(ctx: any) {
    vimOn = !vimOn;
    save();
    if (plaqueEd) {
      plaqueEd.vimOn = vimOn;
      if (!vimOn) plaqueEd.vimMode = "insert";
    }
    try {
      tuiRef?.requestRender();
    } catch {
      // ignore
    }
    ctx.ui.notify(vimOn ? "Vim motions ON (esc: normal mode, i: insert)" : "Vim motions OFF (modeless)", "info");
  }

  function cycleMachitanMode(ctx: any) {
    switchTo("machitan", ctx);
    machitanMode = machitanMode === "flavor" ? "mambo" : machitanMode === "mambo" ? "off" : "flavor";
    save();
    const message =
      machitanMode === "mambo"
        ? "\uEF51 MAMBO MODE! Full Machitan voice — still all business. Ei ei mun!"
        : machitanMode === "flavor"
          ? "\uEF51 Machitan flavor ON — warm, upbeat, game references in moderation."
          : "\uEF51 Machitan persona OFF. Just your coding partner.";
    ctx.ui.notify(message, "info");
  }

  function appendArt(profile: MascotProfile, title: string, lines: string[], quote: string) {
    pi.appendEntry<MascotArtData>(profile.art.entryType, {
      mascot: profile.id,
      title,
      lines,
      quote,
      timestamp: Date.now(),
    });
  }

  // Render full art as a durable transcript entry (not sent to LLM)
  for (const p of [SANA, MACHITAN]) {
    pi.registerEntryRenderer<MascotArtData>(p.art.entryType, (entry, opts, theme) =>
      renderArtEntry(entry, opts, theme),
    );
  }

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    try {
      thinkingLabel = (ctx as any).getThinkingLevel?.() ?? (ctx as any).thinkingLevel ?? thinkingLabel;
    } catch {
      // keep default
    }
    applyHeader(ctx);
    applyWorkingIndicator(ctx, profile());
    if (plaqueOn) applyMascotChrome(ctx);
    try {
      // Plaque shows the level now — clear any old footer pill.
      (ctx.ui as any).setStatus?.("sanae", undefined);
      (ctx.ui as any).setStatus?.("mascot", undefined);
    } catch {
      // ignore
    }
    const p = profile();
    ctx.ui.notify(`${p.icon} ${pick(p.quotes)}  (${p.summonHint})`, "info");
  });

  pi.on("thinking_level_select", async (event, _ctx) => {
    thinkingLabel = event.level;
    try {
      tuiRef?.requestRender();
    } catch {
      // ignore
    }
  });

  pi.on("turn_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    // Fresh verb per thinking process; dots animate within it.
    const p = profile();
    setMascotWorkingVerb(ctx, p.icon, pick(p.verbs));
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    levels[activeId] += 1;
    try {
      tuiRef?.requestRender(); // refresh plaque level
    } catch {
      // ignore
    }
  });

  pi.registerCommand("sanae", {
    description: "Summon full Sanae Kochiya art + shrine quote",
    handler: async (args, ctx) => {
      switchTo("sanae", ctx);
      const extra = args.trim();
      appendArt(
        SANA,
        extra ? `Sanae — ${extra}` : "Sanae Kochiya, has arrived!",
        loadFullArt(SANA),
        pick(SANA.quotes),
      );
    },
  });

  pi.registerCommand("miracle", {
    description: "Sanae blesses your current task as a miracle",
    handler: async (args, ctx) => {
      switchTo("sanae", ctx);
      const task = args.trim() || "this code";
      appendArt(
        SANA,
        `Miracle for: ${task}`,
        loadCompactArt(SANA), // 14-line version, not a crop
        `${pick(SANA.blessings)} (full art: /sanae)`,
      );
      ctx.ui.notify(`✦ Miracle invoked for: ${task}`, "info");
    },
  });

  pi.registerCommand("pray", {
    description: "Pray at Moriya Shrine for your build/tests",
    handler: async (_args, ctx) => {
      switchTo("sanae", ctx);
      ctx.ui.notify(`(‐人‐) ${pick(SANA.blessings)}`, "info");
    },
  });

  pi.registerCommand("sanae-mode", {
    description: "Toggle Sanae-inspired temperament (unnamed, no roleplay)",
    handler: async (_args, ctx) => {
      switchTo("sanae", ctx);
      sanaeMode = !sanaeMode;
      save();
      ctx.ui.notify(
        sanaeMode ? "\uEEE6 Sanae-mode ON! Miracles incoming!" : "Sanae-mode OFF. I'll watch quietly. \uEDF8",
        "info",
      );
    },
  });

  pi.registerCommand("sanae-header", {
    description: "Cycle Sanae header size: slim -> full -> mini -> off (no pi header)",
    handler: async (_args, ctx) => {
      switchTo("sanae", ctx);
      cycleHeader(ctx);
    },
  });

  pi.registerCommand("sanae-editor", {
    description: "Toggle shrine chrome (plaque editor + footer): on -> stock",
    handler: async (_args, ctx) => {
      switchTo("sanae", ctx);
      toggleChrome(ctx);
    },
  });

  pi.registerCommand("sanae-vim", {
    description: "Toggle vim modal editing in the plaque editor",
    handler: async (_args, ctx) => {
      switchTo("sanae", ctx);
      toggleVim(ctx);
    },
  });

  pi.registerCommand("machitan", {
    description: "Summon full Matikanetannhauser art + quote",
    handler: async (args, ctx) => {
      switchTo("machitan", ctx);
      const extra = args.trim();
      appendArt(
        MACHITAN,
        extra ? `Machitan — ${extra}` : "Matikanetannhauser, has arrived!",
        loadFullArt(MACHITAN),
        pick(MACHITAN.quotes),
      );
    },
  });

  pi.registerCommand("mambo", {
    description: "Matikanetannhauser does the festival mambo (compact art)",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      appendArt(
        MACHITAN,
        "Mambo! Mambo! Omatsuri Mambo~",
        loadCompactArt(MACHITAN),
        pick(MACHITAN.mamboQuotes ?? MACHITAN.quotes),
      );
      ctx.ui.notify("\uEF51 Mambo! (/machitan for the full portrait)", "info");
    },
  });

  pi.registerCommand("train", {
    description: "Machitan sets a training menu / blesses your current task",
    handler: async (args, ctx) => {
      switchTo("machitan", ctx);
      const task = args.trim() || "this code";
      appendArt(
        MACHITAN,
        `Training menu for: ${task}`,
        loadCompactArt(MACHITAN),
        `${pick(MACHITAN.blessings)} (full art: /machitan)`,
      );
      ctx.ui.notify(`\uEF51 Training menu set for: ${task}`, "info");
    },
  });

  pi.registerCommand("machitan-mode", {
    description: "Cycle Machitan persona: flavor -> mambo -> off",
    handler: async (_args, ctx) => cycleMachitanMode(ctx),
  });

  pi.registerCommand("mambo-mode", {
    description: "Alias for /machitan-mode",
    handler: async (_args, ctx) => cycleMachitanMode(ctx),
  });

  pi.registerCommand("machitan-header", {
    description: "Switch to Machitan and cycle her header size",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      cycleHeader(ctx);
    },
  });

  pi.registerCommand("machitan-editor", {
    description: "Switch to Machitan and toggle chrome (plaque editor + footer)",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      toggleChrome(ctx);
    },
  });

  pi.registerCommand("machitan-vim", {
    description: "Switch to Machitan and toggle vim modal editing",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      toggleVim(ctx);
    },
  });

  pi.registerCommand("mambo-fact", {
    description: "Print a random Matikanetannhauser fact",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      ctx.ui.notify(`\uEF51 ${pick(MACHITAN.facts ?? MACHITAN.quotes)}`, "info");
    },
  });

  pi.registerCommand("machitan-fact", {
    description: "Alias for /mambo-fact",
    handler: async (_args, ctx) => {
      switchTo("machitan", ctx);
      ctx.ui.notify(`\uEF51 ${pick(MACHITAN.facts ?? MACHITAN.quotes)}`, "info");
    },
  });

  pi.registerCommand("mascot", {
    description: "Switch mascot: /mascot sanae | machitan (or pick from a list)",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      let id: MascotId | undefined;
      if (arg === "sanae" || arg === "machitan" || arg === "mambo") {
        id = arg === "mambo" ? "machitan" : arg;
      } else if (arg) {
        ctx.ui.notify(`Unknown mascot "${arg}". Try: /mascot sanae | machitan`, "warning");
        return;
      } else {
        const choice = await ctx.ui.select("Choose a mascot", [
          "sanae — Sanae Kochiya (Moriya Shrine)",
          "machitan — Matikanetannhauser (Machitan / Mambo)",
        ]);
        if (!choice) return;
        id = choice.startsWith("machitan") ? "machitan" : "sanae";
      }
      if (!id) return;
      switchTo(id, ctx);
      const p = PROFILES[id];
      ctx.ui.notify(`${p.icon} ${p.name} equipped.  (${p.summonHint})`, "info");
    },
  });

  pi.registerCommand("mascot-header", {
    description: "Cycle the active mascot's header: slim -> full -> mini -> off",
    handler: async (_args, ctx) => cycleHeader(ctx),
  });

  pi.registerCommand("mascot-editor", {
    description: "Toggle mascot chrome (plaque editor + footer) <-> stock",
    handler: async (_args, ctx) => toggleChrome(ctx),
  });

  pi.registerCommand("mascot-vim", {
    description: "Toggle vim modal editing in the plaque editor",
    handler: async (_args, ctx) => toggleVim(ctx),
  });

  pi.registerCommand("mascot-theme", {
    description: "Toggle mascot theme auto-swap (moriya-shrine <-> tannhauser-turf)",
    handler: async (_args, ctx) => {
      autoTheme = !autoTheme;
      save();
      if (autoTheme && maybeSwitchTheme(ctx, activeId)) {
        applyHeader(ctx);
        if (plaqueOn) applyMascotChrome(ctx);
        applyWorkingIndicator(ctx, profile());
      }
      ctx.ui.notify(
        autoTheme
          ? "Mascot theme auto-swap ON (only between the two mascot themes)"
          : "Mascot theme auto-swap OFF",
        "info",
      );
    },
  });

  // Temperament layer: only the active mascot's layer is injected. Sanae is
  // deliberately unnamed/no-roleplay; Machitan has flavor and full-roleplay
  // levels. Both are behavior layers, not identity replacements.
  pi.on("before_agent_start", async (event) => {
    const p = profile();
    const mode = p.id === "sanae" ? sanaeMode : machitanMode;
    const layer = p.temperament(mode);
    if (!layer) return undefined;
    return {
      systemPrompt: event.systemPrompt + layer,
    };
  });
}
