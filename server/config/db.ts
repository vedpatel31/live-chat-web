import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Interface Definitions corresponding to the Requested Collections
export interface IUser {
  _id?: string;
  id: string; // fallback identity string
  name: string;
  username: string;
  email: string;
  passwordHash: string; // standard password storage
  avatar: string;
  bio: string;
  skills: string[];
  github: string;
  linkedin: string;
  status: "Online" | "Offline" | "Away";
  createdAt: Date;
}

export interface IMessage {
  _id?: string;
  id: string;
  senderId: string;
  receiverId: string | null; // For private messages
  groupId: string | null;    // For group messages
  message: string;
  type: "text" | "code" | "file" | "voice";
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  repliesTo: string | null; // Id of the message being replied to
  reactions: Array<{ userId: string; username: string; emoji: string }>;
  isPinned: boolean;
  createdAt: Date;
}

export interface IGroup {
  _id?: string;
  id: string;
  groupName: string;
  members: string[]; // User IDs of members
  createdBy: string; // User ID of creator
  createdAt: Date;
}

// Global In-Memory and JSON-FileSync Cache for Local Mode
const DATA_DIR = path.resolve("./data");
const DB_FILE = path.join(DATA_DIR, "devtalk_db.json");

interface LocalStore {
  users: IUser[];
  messages: IMessage[];
  groups: IGroup[];
}

let localStore: LocalStore = {
  users: [],
  messages: [],
  groups: []
};

// Ensure data folder and file exists
function ensureLocalDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), "utf8");
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, "utf8");
      localStore = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse local JSON database, resetting...", e);
      fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), "utf8");
    }
  }
}

function saveLocalDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), "utf8");
}

// Define Mongoose Schemas & Models
const UserSchema = new mongoose.Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "" },
  skills: { type: [String], default: [] },
  github: { type: String, default: "" },
  linkedin: { type: String, default: "" },
  status: { type: String, enum: ["Online", "Offline", "Away"], default: "Offline" },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema<IMessage>({
  id: { type: String, required: true, unique: true },
  senderId: { type: String, required: true, ref: "User" },
  receiverId: { type: String, default: null, ref: "User" },
  groupId: { type: String, default: null, ref: "Group" },
  message: { type: String, required: true },
  type: { type: String, enum: ["text", "code", "file", "voice"], default: "text" },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  repliesTo: { type: String, default: null },
  reactions: {
    type: [{ userId: String, username: String, emoji: String }],
    default: []
  },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true } // Managed manually or via TTL index
});

const GroupSchema = new mongoose.Schema<IGroup>({
  id: { type: String, required: true, unique: true },
  groupName: { type: String, required: true },
  members: { type: [String], default: [] },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export let UserModel: mongoose.Model<IUser>;
export let MessageModel: mongoose.Model<IMessage>;
export let GroupModel: mongoose.Model<IGroup>;

let isMongoDB = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      console.log("Connecting to MongoDB via URI...");
      await mongoose.connect(uri);
      isMongoDB = true;
      console.log("MongoDB is successfully connected!");

      // Set up mongoose models
      UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
      MessageModel = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
      GroupModel = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);

      // Create TTL index in messages: messages older than 5 days (432,000 seconds) are deleted.
      // This is dynamic and production-ready MongoDB native functionality.
      try {
        await mongoose.connection.collection("messages").createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 432000 }
        );
        console.log("MongoDB TTL index for message expiration (5 days) created successfully.");
      } catch (err) {
        console.warn("Could not create TTL index directly (might exist or insufficient privileges).", err);
      }
      return;
    } catch (error) {
      console.error("MongoDB Connection Error. Falling back to high-performance local DB.", error);
    }
  }
  
  console.log("Using self-contained high-performance Local DB...");
  isMongoDB = false;
  ensureLocalDbFile();
  // Call TTL pruning for local db upon startup
  pruneLocalMessagesTTL();
}

// Pruning routine for local files (Messages older than 5 days)
export function pruneLocalMessagesTTL() {
  if (isMongoDB) {
    // MongoDB does this automatically via its TTL index, but we can verify or trigger a query-level filter
    return;
  }
  const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - fiveDaysInMs;
  
  const initialCount = localStore.messages.length;
  localStore.messages = localStore.messages.filter(msg => {
    const creationTime = new Date(msg.createdAt).getTime();
    return creationTime >= cutoffTime;
  });
  
  if (localStore.messages.length < initialCount) {
    console.log(`TTL CleanUp: Pruned ${initialCount - localStore.messages.length} messages older than 5 days.`);
    saveLocalDb();
  }
}

// Run periodic TTL check for local messages every 1 hour
setInterval(() => {
  pruneLocalMessagesTTL();
}, 3600000);

export const dbService = {
  isMongoDB: () => isMongoDB,

  // --- USERS ---
  async getAllUsers(): Promise<IUser[]> {
    if (isMongoDB) {
      return UserModel.find({}).lean();
    }
    return [...localStore.users];
  },

  async getUserById(id: string): Promise<IUser | null> {
    if (isMongoDB) {
      return UserModel.findOne({ id }).lean();
    }
    return localStore.users.find(u => u.id === id) || null;
  },

  async getUserByUsername(username: string): Promise<IUser | null> {
    if (isMongoDB) {
      return UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } }).lean();
    }
    return localStore.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async getUserByEmail(email: string): Promise<IUser | null> {
    if (isMongoDB) {
      return UserModel.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } }).lean();
    }
    return localStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createUser(user: IUser): Promise<IUser> {
    if (isMongoDB) {
      const newUser = new UserModel(user);
      await newUser.save();
      return newUser.toObject();
    }
    localStore.users.push(user);
    saveLocalDb();
    return user;
  },

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (isMongoDB) {
      return UserModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const idx = localStore.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    localStore.users[idx] = { ...localStore.users[idx], ...updates };
    saveLocalDb();
    return localStore.users[idx];
  },

  // --- MESSAGES ---
  async getMessagesForRoom(roomId: string, limit = 50, skip = 0): Promise<IMessage[]> {
    // If roomId is structural, let's determine if group or private
    if (isMongoDB) {
      let query = {};
      if (roomId === "global" || roomId === "general") {
        query = { groupId: null, receiverId: null };
      } else if (roomId.startsWith("group_")) {
        const groupId = roomId.replace("group_", "");
        query = { groupId };
      } else if (roomId.startsWith("p2p_")) {
        // p2p_userA_userB matching
        const parts = roomId.split("_");
        const u1 = parts[1];
        const u2 = parts[2];
        query = {
          $or: [
            { senderId: u1, receiverId: u2 },
            { senderId: u2, receiverId: u1 }
          ]
        };
      }
      return MessageModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .then(messages => messages.reverse()); // Chronological for rendering
    }

    // Local filter
    let msgs: IMessage[] = [];
    if (roomId === "global" || roomId === "general") {
      msgs = localStore.messages.filter(m => m.groupId === null && m.receiverId === null);
    } else if (roomId.startsWith("group_")) {
      const groupId = roomId.replace("group_", "");
      msgs = localStore.messages.filter(m => m.groupId === groupId);
    } else if (roomId.startsWith("p2p_")) {
      const parts = roomId.split("_");
      const u1 = parts[1];
      const u2 = parts[2];
      msgs = localStore.messages.filter(
        m => (m.senderId === u1 && m.receiverId === u2) || (m.senderId === u2 && m.receiverId === u1)
      );
    }

    // Sort, skip, limit
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // pagination from end (since full list is sorted chronological)
    const end = msgs.length - skip;
    const start = Math.max(0, end - limit);
    return msgs.slice(start, end);
  },

  async getMessageById(id: string): Promise<IMessage | null> {
    if (isMongoDB) {
      return MessageModel.findOne({ id }).lean();
    }
    return localStore.messages.find(m => m.id === id) || null;
  },

  async createMessage(msg: IMessage): Promise<IMessage> {
    if (isMongoDB) {
      const newMsg = new MessageModel(msg);
      await newMsg.save();
      return newMsg.toObject();
    }
    localStore.messages.push(msg);
    saveLocalDb();
    return msg;
  },

  async updateMessage(id: string, updates: Partial<IMessage>): Promise<IMessage | null> {
    if (isMongoDB) {
      return MessageModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const idx = localStore.messages.findIndex(m => m.id === id);
    if (idx === -1) return null;
    localStore.messages[idx] = { ...localStore.messages[idx], ...updates };
    saveLocalDb();
    return localStore.messages[idx];
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (isMongoDB) {
      const res = await MessageModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = localStore.messages.findIndex(m => m.id === id);
    if (idx === -1) return false;
    localStore.messages.splice(idx, 1);
    saveLocalDb();
    return true;
  },

  // --- GROUPS ---
  async getGroups(): Promise<IGroup[]> {
    if (isMongoDB) {
      return GroupModel.find({}).lean();
    }
    return [...localStore.groups];
  },

  async getGroupById(id: string): Promise<IGroup | null> {
    if (isMongoDB) {
      return GroupModel.findOne({ id }).lean();
    }
    return localStore.groups.find(g => g.id === id) || null;
  },

  async createGroup(group: IGroup): Promise<IGroup> {
    if (isMongoDB) {
      const newGroup = new GroupModel(group);
      await newGroup.save();
      return newGroup.toObject();
    }
    localStore.groups.push(group);
    saveLocalDb();
    return group;
  },

  async updateGroup(id: string, updates: Partial<IGroup>): Promise<IGroup | null> {
    if (isMongoDB) {
      return GroupModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const idx = localStore.groups.findIndex(g => g.id === id);
    if (idx === -1) return null;
    localStore.groups[idx] = { ...localStore.groups[idx], ...updates };
    saveLocalDb();
    return localStore.groups[idx];
  },

  async deleteGroup(id: string): Promise<boolean> {
    if (isMongoDB) {
      const res = await GroupModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = localStore.groups.findIndex(g => g.id === id);
    if (idx === -1) return false;
    localStore.groups.splice(idx, 1);
    
    // Also remove group messages associated with it
    localStore.messages = localStore.messages.filter(m => m.groupId !== id);
    saveLocalDb();
    return true;
  },

  // --- GLOBAL DEV STATS (DASHBOARD) ---
  async getDbStats() {
    let totalUsers = 0;
    let totalMsgs = 0;
    let totalGroups = 0;
    let onlineUsers = 0;

    if (isMongoDB) {
      totalUsers = await UserModel.countDocuments({});
      totalMsgs = await MessageModel.countDocuments({});
      totalGroups = await GroupModel.countDocuments({});
      onlineUsers = await UserModel.countDocuments({ status: "Online" });
    } else {
      totalUsers = localStore.users.length;
      totalMsgs = localStore.messages.length;
      totalGroups = localStore.groups.length;
      onlineUsers = localStore.users.filter(u => u.status === "Online").length;
    }

    return {
      totalUsers,
      onlineUsers,
      totalMessages: totalMsgs,
      groupsCreated: totalGroups
    };
  }
};
