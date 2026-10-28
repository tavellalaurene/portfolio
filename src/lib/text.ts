export type Mode = "lead" | "build";
export type Text = string | { lead: string; build?: string };

/** Resolve a piece of copy for a mode. Build falls back to Lead. */
export function t(value: Text | undefined, mode: Mode = "lead"): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return mode === "build" ? (value.build ?? value.lead) : value.lead;
}
