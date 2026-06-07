export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  skills: string[];
  github: string;
  linkedin: string;
  status: "Online" | "Offline" | "Away";
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string | null;
  groupId: string | null;
  message: string;
  type: "text" | "code" | "file" | "voice";
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  repliesTo: string | null; // ID of message replied to
  repliesToMessage?: Message | null;
  reactions: Array<{ userId: string; username: string; emoji: string }>;
  isPinned: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  groupName: string;
  members: string[]; // User IDs
  createdBy: string;
  createdAt: string;
}

export interface ChartData {
  day: string;
  messages: number;
}

export interface ActiveUserData {
  status: string;
  count: number;
}
