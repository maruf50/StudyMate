import type { InterestSegment, MatchCandidate } from "./types";
import type { User } from "./api";

export function buildInterestChart(user: User | null): {
  background: string;
  segments: InterestSegment[];
} {
  const fallback = {
    background: "conic-gradient(#d5e6f3 0deg 360deg)",
    segments: [] as InterestSegment[]
  };

  if (!user || user.interests.length === 0) {
    return fallback;
  }

  const counts = new Map<string, number>();
  for (const interest of user.interests) {
    const topic = interest.topic.trim();
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }

  const palette = ["#136f63", "#2a7bc0", "#db8f2e", "#7b5ccf", "#d65f5f", "#1a9ea0"];
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  let start = 0;

  const segments = Array.from(counts.entries()).map(([topic, value], index) => {
    const percent = Math.round((value / total) * 100);
    const sweep = (value / total) * 360;
    const end = start + sweep;
    const color = palette[index % palette.length];
    const segment = { topic, color, percent, start, end };
    start = end;
    return segment;
  });

  const gradientStops = segments.map((segment) => {
    return `${segment.color} ${segment.start.toFixed(1)}deg ${segment.end.toFixed(1)}deg`;
  });

  return {
    background: `conic-gradient(${gradientStops.join(", ")})`,
    segments: segments.map(({ topic, color, percent }) => ({ topic, color, percent }))
  };
}

export function filterMatchesByInterest(matches: MatchCandidate[], interest: string): MatchCandidate[] {
  if (!interest.trim()) {
    return matches;
  }

  const target = interest.trim().toLowerCase();
  return matches.filter((candidate) => {
    const interests = Array.isArray(candidate.interests) ? candidate.interests : [];
    return interests.some((entry) => entry.topic.trim().toLowerCase() === target);
  });
}

export function uniqueInterestTopics(user: User | null): string[] {
  const set = new Set<string>();
  user?.interests.forEach((item) => set.add(item.topic));
  return Array.from(set);
}
