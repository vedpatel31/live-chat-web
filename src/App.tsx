import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Loader2, Terminal, RefreshCw, Bell, TerminalSquare, X } from "lucide-react";
import { User, Message, Group } from "./types";
import { AuthPage } from "./components/AuthPage";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { StatsDashboard } from "./components/StatsDashboard";
import { TerminalLoader } from "./components/Loader";

// Unified state alert message toast
interface Toast {
  id: string;
  message: string;
  title: string;
  type: "info" | "mention" | "system";
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("devtalk_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Active Navigation Chambers
  const [currentRoomId, setCurrentRoomId] = useState<string>("global");
  const [currentRoomName, setCurrentRoomName] = useState<string>("🌐 General Developer Room");
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");

  // Global Loader
  const [appInitializing, setAppInitializing] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Dynamic Toast Alerts list
  const [toasts, setToasts] = useState<Toast[]>([]);

  const socketRef = useRef<any>(null);

  // Load User details and sync from storage on initial startup
  useEffect(() => {
    async function initUserContext() {
      if (!token) {
        setAppInitializing(false);
        return;
      }

      try {
        const res = await fetch("/api/user/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const userObj = await res.json();
          setCurrentUser(userObj);
          
          // Pull other systems arrays
          await Promise.all([
            loadDevelopersList(),
            loadGroupsList()
          ]);
        } else {
          // Token expired or invalid
          localStorage.removeItem("devtalk_token");
          setToken(null);
        }
      } catch (err) {
        console.error("Initial pipeline failed", err);
      } finally {
        setAppInitializing(false);
      }
    }

    initUserContext();
  }, [token]);

  // Load other registered developers
  const loadDevelopersList = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.warn("Could not retrieve developer registry index", err);
    }
  };

  // Load group chats
  const loadGroupsList = async () => {
    try {
      const res = await fetch("/api/groups", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.warn("Could not retrieve group index list", err);
    }
  };

  // Setup Socket Connection
  useEffect(() => {
    if (!token || !currentUser) return;

    // Connect socket on same port root path
    const socket = io({
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      // Authenticated with backend
      socket.emit("authenticate", { token });
      
      addToast({
        title: "Telemetry handshaked",
        message: "Socket connected live to DevTalk control pipelines.",
        type: "system"
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen to live presence updates
    socket.on("user_status_changed", (data: { userId: string; status: "Online" | "Away" | "Offline"; user?: any }) => {
      setUsers((prev) => 
        prev.map((u) => {
          if (u.id === data.userId) {
            return { ...u, status: data.status, ...data.user };
          }
          return u;
        })
      );

      // Trigger short status toast if someone logs in / goes away
      if (data.userId !== currentUser.id && data.status === "Online") {
        const name = data.user?.name || "A developer";
        addToast({
          title: "Telemetry Alert 📡",
          message: `${name} has joined the workspace pipeline.`,
          type: "info"
        });
      }
    });

    socket.on("initial_presence", (statusList: Array<{ id: string; status: any }>) => {
      setUsers((prev) => 
        prev.map((u) => {
          const matched = statusList.find(s => s.id === u.id);
          if (matched) {
            return { ...u, status: matched.status };
          }
          return u;
        })
      );
    });

    // Handle background incoming messages for Toasts (Mentions & DMs)
    socket.on("new_message", (msg: Message) => {
      if (msg.senderId === currentUser.id) return;
      
      const isMyDM = msg.receiverId === currentUser.id;
      const isMention = msg.message.includes(`@${currentUser.username}`);
      const senderObj = users.find(u => u.id === msg.senderId) || { name: "Developer Cluster" };

      if (isMyDM) {
        addToast({
          title: `DM from @${senderObj.username}`,
          message: msg.type === "voice" ? "🎙️ Sent you a voice memo." : msg.type === "file" ? "📁 Sent you a file transmission." : msg.message,
          type: "mention"
        });
      } else if (isMention) {
        addToast({
          title: `Mention in ${msg.groupId ? "Group" : "Global"} Room`,
          message: `${senderObj.name}: ${msg.message}`,
          type: "mention"
        });
      }
    });

    // Synchronize Group actions globally
    socket.on("group_created", (grp: Group) => {
      setGroups((prev) => {
        if (prev.some(g => g.id === grp.id)) return prev;
        return [...prev, grp];
      });
      // trigger toast
      if (grp.createdBy !== currentUser.id) {
        addToast({
          title: "New Cluster Group Invitations",
          message: `Added into: ${grp.groupName}`,
          type: "info"
        });
      }
    });

    socket.on("group_deleted", (data: { groupId: string }) => {
      setGroups((prev) => prev.filter(g => g.id !== data.groupId));
      if (currentRoomId === `group_${data.groupId}`) {
        setCurrentRoomId("global");
        setCurrentRoomName("🌐 General Developer Room");
      }
    });

    socket.on("group_updated", (grp: Group) => {
      setGroups((prev) => prev.map(g => g.id === grp.id ? grp : g));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, currentUser]);

  // Manage Toast systems
  const addToast = (t: Omit<Toast, "id">) => {
    const id = "toast_" + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // Auth Page state changes
  const handleAuthSuccess = (newToken: string, userObj: User) => {
    localStorage.setItem("devtalk_token", newToken);
    setToken(newToken);
    setCurrentUser(userObj);
  };

  const handleLogout = () => {
    localStorage.removeItem("devtalk_token");
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
    setGroups([]);
    setCurrentRoomId("global");
    setCurrentRoomName("🌐 General Developer Room");
  };

  const handleProfileUpdate = (updated: User) => {
    setCurrentUser(updated);
    setUsers((prev) => prev.map(u => u.id === updated.id ? updated : u));
    addToast({
      title: "System Config Compiled",
      message: "Developer profile adjustments written successfully.",
      type: "system"
    });
  };

  const handleGroupCreated = (grp: Group) => {
    setGroups((prev) => [...prev, grp]);
  };

  // Core view router
  if (appInitializing) {
    return <TerminalLoader message="Resolving DevTalk core authentication token context..." />;
  }

  if (!token || !currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-[#f1f5f9] font-sans antialiased">
      
      {/* Sidebar Section */}
      <Sidebar 
        currentUser={currentUser}
        users={users}
        groups={groups}
        currentRoomId={currentRoomId}
        onRoomSelect={(roomId, roomName) => {
          setCurrentRoomId(roomId);
          setCurrentRoomName(roomName);
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        token={token}
        onProfileUpdate={handleProfileUpdate}
        onGroupCreate={handleGroupCreated}
      />

      {/* Main Dynamic Workspace Panel router */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        {activeTab === "chat" ? (
          <ChatArea 
            socket={socketRef.current}
            currentUser={currentUser}
            users={users}
            currentRoomId={currentRoomId}
            roomName={currentRoomName}
            token={token}
          />
        ) : (
          <StatsDashboard 
            currentUser={currentUser}
            users={users}
            token={token}
          />
        )}
      </div>

      {/* Real-time Toast Notifications Alert Widget Stack */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm pointer-events-none select-none select-none font-sans">
        {toasts.map((t) => (
          <div 
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl glass border shadow-2xl flex items-start space-x-3 text-slate-200 transition-all duration-300 animate-[slideIn_0.2s_ease-out] ${
              t.type === "mention" ? "border-purple-500/30 bg-purple-950/70" : 
              t.type === "system" ? "border-emerald-500/20 bg-slate-950/80" : "border-slate-800 bg-[#0f172a]/70"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${
              t.type === "mention" ? "bg-purple-500/10 text-purple-400" : 
              t.type === "system" ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{t.title}</h5>
              <p className="text-xxs leading-relaxed text-slate-400 mt-1">{t.message}</p>
            </div>

            <button 
              onClick={() => removeToast(t.id)} 
              className="text-slate-500 hover:text-slate-350 cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
