export type View = "dashboard" | "matching" | "groups" | "notes" | "friends" | "chat" | "tracker";

export type NoteContent = {
  type: "text" | "image" | "link";
  id: string;
  content: string;
  metadata?: string;
};

export type FriendRequestSummary = {
  id: string;
  requesterId: string;
  requesterUsername: string;
  addresseeId: string;
  addresseeUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  isIncoming?: boolean;
  isOutgoing?: boolean;
};

export type GroupInviteSummary = {
  id: string;
  groupId: string;
  groupName: string;
  groupTopic: string;
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
  inviteeUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  isIncoming?: boolean;
  isOutgoing?: boolean;
};

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
  userId?: string;
  ownerUsername?: string;
  content?: NoteContent[];
  isPrivate?: boolean;
  canEdit?: boolean;
  isFriendShared?: boolean;
  accessRequestCount?: number;
  updatedAt?: string;
};

export type InterestSegment = {
  topic: string;
  color: string;
  percent: number;
};
