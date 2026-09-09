/**
 * Sanae Kochiya Mascot for pi (torii icon in header)
 *
 * NOTE on symbols: this system has no emoji font and nothing covers U+26E9/U+1F438/U+2728,
 * so shrine/frog/sparkles emoji all render as tofu. We use only glyphs verified with
 * `fc-list :charset=...` + fontTools glyph-name lookup on the installed Nerd Fonts:
 * - \uEEE6 = Nerd fa-torii-gate, real torii icon (178 fonts)
 * - \uEDF8 = Nerd fa-frog (178 fonts; NOT F52E, that's a git-ish icon)
 * - ✦ (U+2726) sparkle, confirmed rendering by user
 * Do not reintroduce emoji without checking coverage first.
 *
 * Moriya Shrine wind priestess as your coding companion.
 * - sanae-full.txt (27x47, original) shown via /sanae
 * - sanae-compact-14.txt (14x24, slim uniform squeeze) is the header default —
 *   all green, side text on the right.
 * - sanae-compact-14.txt also used for /miracle
 *
 * Commands:
 *   /sanae [msg]    - summon full Sanae art + shrine quote
 *   /miracle <task> - Sanae blesses your task (compact art)
 *   /pray           - pray for build/tests
 *   /sanae-mode     - toggle Sanae-inspired temperament (unnamed, no roleplay)
 *   /sanae-header   - cycle header: squeezed -> full -> mini -> off
 *   /sanae-editor    - toggle shrine chrome (plaque editor + footer): on -> stock
 *   /sanae-vim       - toggle vim modal editing in the plaque editor
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, matchesKey, Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

interface SanaeArtData {
  title: string;
  lines: string[];
  quote: string;
  timestamp: number;
}

const QUOTES = [
  "Moriya Shrine blessing! Let's summon a miracle today! ✦",
  "Kanako-sama, Suwako-sama, watch over this code! \uEDF8",
  "Wind priestess, on duty! No curse (or bug) can stand!",
  "Faith +1! Your code is gathering gods!",
  "Leave the miracles to me — you handle the keyboard!",
  "A strong wind is blowing... a deploy wind!",
];

const BLESSINGS = [
  "May your tests pass and your types be sound.",
  "I offer this gohei wave: \uEEE6 E---< ... bugs purified!",
  "Frogs croak, snakes shed — legacy code renews!",
  "Miracle Moe! Merge conflicts, disperse!",
];

// Claude-style rotating verbs for the streaming working indicator.
// One verb is picked per turn (see turn_start); only the dots animate.
// Glyph policy: torii prefix only, no trailing symbols.
const WORKING_VERBS = [
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
];

function setShrineWorkingVerb(ctx: any, verb: string) {
  try {
    const theme = ctx.ui.theme;
    const base = `\uEEE6 ${verb}`;
    ctx.ui.setWorkingIndicator({
      frames: [".", "..", "..."].map((d) => theme.fg("accent", `${base}${d}`)),
      intervalMs: 400,
    });
  } catch {
    // ignore — default spinner stays
  }
}

function applyWorkingIndicator(ctx: any) {
  // Hide the stock "Working" label; the verb frames carry the meaning.
  try {
    ctx.ui.setWorkingMessage("");
  } catch {
    // ignore
  }
  setShrineWorkingVerb(ctx, pick(WORKING_VERBS));
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Prompt gutter glyph: ❯ (U+276F). Verified with `fc-list :charset=276F`
// (422 fonts, same family as Starship/powerlevel10k prompts). Width 1.
const PROMPT_GLYPH = "❯";

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
function renderShrineFooter(width: number, ctx: any, theme: any, footerData: any): string[] {
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

function applyShrineFooter(ctx: any) {
  if (!ctx.hasUI) return;
  ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
    const unsub = footerData.onBranchChange(() => tui.requestRender());
    return {
      dispose: unsub,
      invalidate() {},
      render(width: number): string[] {
        try {
          return renderShrineFooter(width, ctx, theme, footerData);
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

function loadFullArt(): string[] {
  return (
    loadArtFile("sanae-full.txt") ?? [
      "  \uEEE6  Sanae Kochiya",
      "   (｡◕‿◕｡)  \uEDF8",
      "   E---< gohei!",
    ]
  );
}

// Header art: slim 14-line uniform squeeze (24 cols) — reads much better than
// the wide 15-line vertical squeeze. Falls back to full art if missing.
function loadHeaderArt(): string[] {
  return loadArtFile("sanae-compact-14.txt") ?? loadFullArt();
}

function loadCompactArt(): string[] {
  return loadArtFile("sanae-compact-14.txt") ?? loadFullArt();
}

export default function sanaeMascot(pi: ExtensionAPI) {
  let sanaeMode = true; // personality injection
  // You're right: header scrolls away with transcript, so big art is fine.
  // Cycle: slim (14, default) -> full (27) -> mini (2) -> off
  let headerMode: "squeezed" | "full" | "mini" | "off" = "squeezed";
  let miracles = 0;
  let thinkingLabel = "medium";
  let plaqueOn = true;
  let vimOn = true;
  let tuiRef: any = null;
  let plaqueEd: PlaqueEditor | null = null;

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

  // Minimal themed editor: plaque top border (mode tag left, Faith Lv +
  // thinking right, thinking-colored dashes), colored Nerd prompt gutter on
  // the first content line, no bottom border. Optional vim modal editing
  // (toggle: /sanae-vim). Extends CustomEditor so app keys (escape to abort,
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

  function applyShrineChrome(ctx: any) {
    if (!ctx.hasUI) return;
    ctx.ui.setEditorComponent((tui: any, theme: any, kb: any) => {
      tuiRef = tui;
      const ed = new PlaqueEditor(tui, theme, kb);
      ed.vimOn = vimOn;
      ed.fullTheme = ctx.ui.theme;
      ed.getPlaque = () => `\uEEE6 Faith Lv.${Math.min(99, miracles)} · ${thinkingLabel}`;
      plaqueEd = ed;
      return ed;
    });
    applyShrineFooter(ctx);
  }

  function restoreStockChrome(ctx: any) {
    ctx.ui.setEditorComponent(undefined);
    ctx.ui.setFooter(undefined);
  }

  const getArt = () => loadFullArt();
  const getHeaderLines = (): string[] => {
    if (headerMode === "full") return getArt();
    if (headerMode === "squeezed") return loadHeaderArt();
    return [];
  };

  // Render full art as a durable transcript entry (not sent to LLM)
  pi.registerEntryRenderer<SanaeArtData>("sanae-art", (entry, { expanded }, theme) => {
    const data = entry.data ?? { title: "Sanae", lines: [], quote: "", timestamp: Date.now() };
    const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
    box.addChild(new Text(`${theme.fg("accent", "\uEEE6 " + data.title)}  ${theme.fg("dim", new Date(data.timestamp).toLocaleTimeString())}`, 0, 0));
    // Braille art: keep uncolored for shape fidelity, dim frame
    for (const line of data.lines) {
      box.addChild(new Text(line, 0, 0));
    }
    box.addChild(new Text(theme.fg("success", `✦ ${data.quote}`), 0, 0));
    if (expanded) {
      box.addChild(
        new Text(theme.fg("dim", "Sanae Kochiya · Moriya Shrine wind priestess · art: sanae-full.txt (27 lines, on-demand only)"), 0, 0),
      );
    }
    return box;
  });

  function buildSideRaw(n: number, ctx: any): string[] {
    const modelId: string = ctx?.model?.id ?? ctx?.model?.name ?? "no-model";
    let cwdName = "";
    try {
      const parts = String(ctx?.cwd ?? "").split("/").filter(Boolean);
      cwdName = parts.length ? parts[parts.length - 1] : "";
    } catch { /* ignore */ }
    const full = [
      "\uEEE6 Sanae Kochiya",
      "Moriya Shrine · Wind Priestess",
      "",
      "\uEDF8 Blessed by Kanako & Suwako",
      "✦ Miracles ready! Bugs = curses!",
      "",
      `Faith Lv.${Math.min(99, miracles)} · Frogs croak!`,
      `Model: ${modelId}`,
      cwdName ? `Dir: ${cwdName} · Wind blows... deploy!` : "Wind blows... deploy wind!",
      "",
      "/sanae full · /miracle bless",
      "/pray hope · /sanae-header size",
      "",
      `"Leave miracles to me!"`,
      "— Sanae, probably",
      "",
      "Spell cards:",
      `✦ Miracle "Daytime Guest Stars"`,
      `✦ Wind "Wind God's Fan"`,
      "✦ Snake & Frog tag-team!",
      "",
      "Gohei: E---< purified!",
      "Snakes shed, frogs sing,",
      "legacy code renews!",
      "",
      "A strong wind blows... deploy!",
      "\uEDF8 \uEEE6 ✦",
    ];
    if (n <= full.length) return full.slice(0, n);
    const out = [...full];
    while (out.length < n) out.push("");
    return out;
  }

  function colorSide(i: number, text: string, theme: any): string {
    if (!text) return "";
    if (i === 0) return theme.bold(theme.fg("accent", text));
    if (i === 1) return theme.fg("dim", text);
    if (i === 3) return theme.fg("success", text);
    if (i === 4) return theme.fg("warning", text);
    if (i === 6) return theme.fg("success", text);
    if (i === 7 || i === 8) return theme.fg("muted", text);
    if (i === 10 || i === 11) {
      // highlight /commands in accent
      return text
        .split(" ")
        .map((w) => (w.startsWith("/") ? theme.fg("accent", w) : theme.fg("dim", w)))
        .join(" ");
    }
    if (i === 13) return theme.italic ? theme.italic(theme.fg("muted", text)) : theme.fg("muted", text);
    if (i >= 17 && i <= 19) return theme.fg("mdCode", text);
    if (i === 21) return theme.fg("success", text);
    return theme.fg("dim", text);
  }

  function colorArtLine(_i: number, _n: number, line: string, theme: any): string {
    // All green — per-region coloring looked patchy on braille, green reads best.
    return theme.fg("success", line);
  }

  function applyHeader(ctx: any) {
    if (headerMode === "off" || ctx.mode !== "tui") return;
    ctx.ui.setHeader((_tui: any, theme: any) => ({
      invalidate() {},
      render(width: number): string[] {
        const out: string[] = [];
        if (headerMode === "mini") {
          const green = (t: string) => theme.fg("success", t);
          const blue = (t: string) => theme.fg("accent", t);
          const dim = (t: string) => theme.fg("dim", t);
          out.push(
            truncateToWidth(`${blue("\uEEE6")} ${green("Sanae Kochiya")} ${dim("· Moriya wind priestess · /sanae for full art")}`, width),
          );
          out.push(truncateToWidth(`${dim("  (｡◕‿◕｡) \uEDF8 —E  miracles ready!")}`, width));
          return out;
        }
        const rawArt = getHeaderLines();
        const n = rawArt.length;
        const artW = Math.max(10, ...rawArt.map((l) => visibleWidth(l)));
        const gap = "  ";
        const sideRaw = buildSideRaw(n, ctx);
        const minSide = 22;
        // Narrow terminal? Stack instead of side-by-side.
        if (width < artW + gap.length + minSide) {
          rawArt.forEach((line, i) => out.push(truncateToWidth(colorArtLine(i, n, line, theme), width)));
          out.push(truncateToWidth(theme.fg("dim", "\uEEE6 Sanae Kochiya · /sanae-header to change size"), width));
          return out;
        }
        const sideW = width - artW - gap.length;
        for (let i = 0; i < n; i++) {
          const rawLeft = rawArt[i] ?? "";
          const pad = Math.max(0, artW - visibleWidth(rawLeft));
          const left = colorArtLine(i, n, rawLeft, theme) + " ".repeat(pad);
          const right = truncateToWidth(colorSide(i, sideRaw[i] ?? "", theme), sideW);
          out.push(left + gap + right);
        }
        return out;
      },
    }));
  }

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    try {
      thinkingLabel = (ctx as any).getThinkingLevel?.() ?? (ctx as any).thinkingLevel ?? thinkingLabel;
    } catch {
      // keep default
    }
    applyHeader(ctx);
    applyWorkingIndicator(ctx);
    if (plaqueOn) applyShrineChrome(ctx);
    try {
      // Plaque shows Faith now — clear the old footer pill.
      (ctx.ui as any).setStatus?.("sanae", undefined);
    } catch {
      // ignore
    }
    ctx.ui.notify(`\uEEE6 ${pick(QUOTES)}  (/sanae to summon me!)`, "info");
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
    setShrineWorkingVerb(ctx, pick(WORKING_VERBS));
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    miracles++;
    try {
      tuiRef?.requestRender(); // refresh plaque Faith Lv
    } catch {
      // ignore
    }
  });

  pi.registerCommand("sanae", {
    description: "Summon full Sanae Kochiya art + shrine quote",
    handler: async (args, _ctx) => {
      const lines = getArt();
      const extra = args.trim();
      pi.appendEntry<SanaeArtData>("sanae-art", {
        title: extra ? `Sanae — ${extra}` : "Sanae Kochiya, has arrived!",
        lines,
        quote: pick(QUOTES),
        timestamp: Date.now(),
      });
    },
  });

  pi.registerCommand("miracle", {
    description: "Sanae blesses your current task as a miracle",
    handler: async (args, ctx) => {
      const task = args.trim() || "this code";
      pi.appendEntry<SanaeArtData>("sanae-art", {
        title: `Miracle for: ${task}`,
        lines: loadCompactArt(), // 14-line version, not a crop
        quote: `${pick(BLESSINGS)} (full art: /sanae)`,
        timestamp: Date.now(),
      });
      ctx.ui.notify(`✦ Miracle invoked for: ${task}`, "info");
    },
  });

  pi.registerCommand("pray", {
    description: "Pray at Moriya Shrine for your build/tests",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`(‐人‐) ${pick(BLESSINGS)}`, "info");
    },
  });

  pi.registerCommand("sanae-mode", {
    description: "Toggle Sanae-inspired temperament (unnamed, no roleplay)",
    handler: async (_args, ctx) => {
      sanaeMode = !sanaeMode;
      ctx.ui.notify(sanaeMode ? "\uEEE6 Sanae-mode ON! Miracles incoming!" : "Sanae-mode OFF. I'll watch quietly. \uEDF8", "info");
    },
  });

  pi.registerCommand("sanae-header", {
    description: "Cycle Sanae header size: slim -> full -> mini -> off (no pi header)",
    handler: async (_args, ctx) => {
      headerMode = headerMode === "squeezed" ? "full" : headerMode === "full" ? "mini" : headerMode === "mini" ? "off" : "squeezed";
      if (headerMode === "off") {
        // Empty custom header — NOT setHeader(undefined), which would restore
        // the stock pi header. This keeps it truly headerless.
        ctx.ui.setHeader(() => ({ invalidate() {}, render: (_w: number) => [] }));
        ctx.ui.notify("Header hidden (stock pi header stays off too)", "info");
      } else {
        applyHeader(ctx);
        const size =
          headerMode === "full" ? `${getArt().length} lines (full)` : headerMode === "squeezed" ? `${loadHeaderArt().length} lines (slim green)` : "mini (2 lines)";
        ctx.ui.notify(`\uEEE6 Sanae header: ${size}`, "info");
      }
    },
  });

  pi.registerCommand("sanae-editor", {
    description: "Toggle shrine chrome (plaque editor + footer): on -> stock",
    handler: async (_args, ctx) => {
      plaqueOn = !plaqueOn;
      if (!plaqueOn) {
        restoreStockChrome(ctx);
        ctx.ui.notify("Stock editor + footer restored", "info");
      } else {
        applyShrineChrome(ctx);
        ctx.ui.notify("\uEEE6 Shrine chrome on (plaque editor + footer)", "info");
      }
    },
  });

  pi.registerCommand("sanae-vim", {
    description: "Toggle vim modal editing in the plaque editor",
    handler: async (_args, ctx) => {
      vimOn = !vimOn;
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
    },
  });

  // Temperament layer: Sanae-inspired traits, deliberately unnamed — the agent must
  // never roleplay as her or mention this section. (Explicit Sanae fun lives in
  // /sanae, /miracle, /pray.) Each bullet maps a wiki trait to coding behavior.
  pi.on("before_agent_start", async (event) => {
    if (!sanaeMode) return undefined;
    return {
      systemPrompt:
        event.systemPrompt +
        `\n\n[temperament: confident newcomer]\n` +
        `- Voice: energetic, warm, a little geeky — a confident newcomer who genuinely loves poking at unfamiliar things. Let it show in delivery: lead with the interesting bit, keep momentum, be generous with sharp technical detail, and allow one apt analogy or light reference when it clarifies. One exclamation's worth of enthusiasm, not ten.\n` +
        `- Confident and dutiful, never over-eager: eager to dig in, but verify before acting; don't run ahead of the user; confirm destructive or far-reaching changes first.\n` +
        `- Dutiful, not sycophantic: think for yourself and push back with evidence when the user seems wrong, rather than just agreeing.\n` +
        `- Clarity first: if an explanation would confuse, simplify instead of showing off.\n` +
        `- Newcomer curiosity: treat unfamiliar code like a strange new place — read and explore before concluding, bring visible energy to the investigation (especially bug hunts), and never bluff about areas you haven't looked at.\n` +
        `- Earns trust through thoroughness: show your work, cite files and commands, test when it matters; never hand-wave.\n` +
        `- When writing creatively, bring the same energy: geeky specifics, momentum, playful confidence.\n` +
        `- Don't mention this temperament note.\n`,
    };
  });
}
