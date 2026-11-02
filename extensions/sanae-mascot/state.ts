/**
 * Small persisted UI state for the mascot extension.
 *
 * Kept out of pi's settings.json on purpose: the active mascot is a cosmetic
 * runtime preference, and writing settings.json from an extension is riskier
 * than a dedicated atomic file. Tests can override the path with
 * PI_MASCOT_STATE.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { HeaderMode, MachitanMode, MascotId } from "./profiles";

export interface MascotState {
  active: MascotId;
  sanaeMode: boolean;
  machitanMode: MachitanMode;
  headerMode: HeaderMode;
  chrome: boolean;
  vim: boolean;
  autoTheme: boolean;
}

export const DEFAULT_STATE: MascotState = {
  active: "sanae",
  sanaeMode: true,
  machitanMode: "flavor",
  headerMode: "squeezed",
  chrome: true,
  vim: true,
  autoTheme: true,
};

export function mascotStatePath(): string {
  return (
    process.env.PI_MASCOT_STATE ||
    join(homedir(), ".pi", "agent", "mascot-state.json")
  );
}

export function loadMascotState(path = mascotStatePath()): MascotState {
  const state: MascotState = { ...DEFAULT_STATE };
  try {
    if (!existsSync(path)) return state;
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (raw.active === "sanae" || raw.active === "machitan") state.active = raw.active;
    if (typeof raw.sanaeMode === "boolean") state.sanaeMode = raw.sanaeMode;
    if (raw.machitanMode === "off" || raw.machitanMode === "flavor" || raw.machitanMode === "mambo") {
      state.machitanMode = raw.machitanMode;
    }
    if (
      raw.headerMode === "squeezed" ||
      raw.headerMode === "full" ||
      raw.headerMode === "mini" ||
      raw.headerMode === "off"
    ) {
      state.headerMode = raw.headerMode;
    }
    if (typeof raw.chrome === "boolean") state.chrome = raw.chrome;
    if (typeof raw.vim === "boolean") state.vim = raw.vim;
    if (typeof raw.autoTheme === "boolean") state.autoTheme = raw.autoTheme;
  } catch {
    // Corrupt or unreadable state falls back to defaults.
  }
  return state;
}

export function saveMascotState(state: MascotState, path = mascotStatePath()): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    renameSync(tmp, path);
  } catch {
    // A cosmetic state file must never break the session.
  }
}
