import type { View } from "./types";
import type { ReactNode } from "react";

export const XP_GOAL = 500;
export const STUDY_HOURS_GOAL = 20;
 
export const STUDY_INTEREST_OPTIONS = [
  "math",
  "physics",
  "chemistry",
  "biology",
  "computer science",
  "programming",
  "statistics",
  "economics",
  "history",
  "literature",
  "design",
  "languages"
];

export const NAV_ITEMS: Array<{ id: View; label: string; icon?: ReactNode }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "matching", label: "Matching" },
  { id: "groups", label: "Groups" },
  { id: "notes", label: "Notes" },
  { id: "friends", label: "Friends" },
  { id: "chat", label: "Chat" },
  { id: "tracker", label: "Tracker" }
];
