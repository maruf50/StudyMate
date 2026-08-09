import type { InterestSegment, MatchCandidate } from "./types";
import type { User } from "./api";

export function buildInterestChart(user: User | null): {
  background: string;
  segments: InterestSegment[];
} {
  const fallback = {
    background: "conic-gradient(#e4e4e7 0deg 360deg)",
    segments: [] as InterestSegment[]
  };

  const interests = Array.isArray(user?.interests) ? user.interests : [];

  if (!user || interests.length === 0) {
    return fallback;
  }

  const counts = new Map<string, number>();
  for (const interest of interests) {
    const topic = interest.topic.trim();
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }

  const palette = ["#09090b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#27272a"];
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

export function filterMatchesByInterest(matches: MatchCandidate[], interest: string | string[]): MatchCandidate[] {
  const selectedInterests = Array.isArray(interest) ? interest : [interest];
  const targets = selectedInterests.map((value) => value.trim().toLowerCase()).filter(Boolean);

  if (targets.length === 0) {
    return matches;
  }

  return matches.filter((candidate) => {
    const interests = Array.isArray(candidate.interests) ? candidate.interests : [];
    return interests.some((entry) => targets.includes(entry.topic.trim().toLowerCase()));
  });
}

export function uniqueInterestTopics(user: User | null): string[] {
  const set = new Set<string>();
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  interests.forEach((item) => set.add(item.topic));
  return Array.from(set);
}
