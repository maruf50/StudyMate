import type { View } from "./types";

export const XP_GOAL = 500;
export const STUDY_HOURS_GOAL = 20;

export const NAV_ITEMS: Array<{ id: View; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "notes", label: "Notes" },
  { id: "chat", label: "Chat" }
];
