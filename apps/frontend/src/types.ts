export type View = "dashboard" | "notes";

export type Message = {
  id: string;
  username: string;
  content: string;
  groupId?: string | null;
  createdAt: string;
};

export type MatchCandidate = {
  userId: string;
  username: string;
  score: number;
  interests?: Array<{ topic: string }>;
};

export type GroupSummary = {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  studyTopic: string;
  studyDescription: string;
  leaderName: string;
  totalStudyMinutes: number;
  isActive: boolean;
  activeSessionCount: number;
  hasCapacity: boolean;
  isMember: boolean;
  canJoin: boolean;
};

export type NoteSummary = {
  id: string;
  title: string;
};

export type InterestSegment = {
  topic: string;
  color: string;
  percent: number;
};
