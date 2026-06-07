import React, { useState } from "react";
import { 
  Plus, Settings, LogOut, MessageSquare, Shield, FolderGit2, Search, Github, Linkedin, 
  Terminal, Globe, Circle, LayoutDashboard, Database, X, Check, Save, BadgeCheck 
} from "lucide-react";
import { User, Group } from "../types";

interface SidebarProps {
  currentUser: User;
  users: User[];
  groups: Group[];
  currentRoomId: string;
  onRoomSelect: (roomId: string, name: string) => void;
  activeTab: "chat" | "dashboard";
  onTabChange: (tab: "chat" | "dashboard") => void;
  onLogout: () => void;
  token: string | null;
  onProfileUpdate: (updatedUser: User) => void;
  onGroupCreate: (newGroup: Group) => void;
}

export function Sidebar({ 
  currentUser, users, groups, currentRoomId, onRoomSelect, activeTab, onTabChange, 
  onLogout, token, onProfileUpdate, onGroupCreate 
}: SidebarProps) {
  
  // Modals status
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // Profile update state
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [github, setGithub] = useState(currentUser.github || "");
  const [linkedin, setLinkedin] = useState(currentUser.linkedin || "");
  const [skillsStr, setSkillsStr] = useState(currentUser.skills.join(", "));
  const [userProfileStatus, setUserProfileStatus] = useState<"Online" | "Offline" | "Away">(currentUser.status || "Online");
  const [profileSaving, setProfileSaving] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  // Users lookup DM query
  const [dmSearch, setDmSearch] = useState("");

  // Handle profile modal save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    const skills = skillsStr.split(",").map(s => s.trim()).filter(s => s.length > 0);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          bio,
          skills,
          github,
          linkedin,
          status: userProfileStatus
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
        setShowProfileModal(false);
      } else {
        alert("Failed to update profile details.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Quick online status modifier
  const changePresenceStatus = async (presence: "Online" | "Offline" | "Away") => {
    setUserProfileStatus(presence);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: presence })
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setGroupSaving(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          groupName,
          members: selectedGroupMembers
        })
      });

      if (res.ok) {
        const data = await res.json();
        onGroupCreate(data);
        setShowGroupModal(false);
        setGroupName("");
        setSelectedGroupMembers([]);
        // Auto-select new group
        onRoomSelect(`group_${data.id}`, `# ${data.groupName}`);
        onTabChange("chat");
      } else {
        alert("Could not register group.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGroupSaving(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (userId: string) => {
    setSelectedGroupMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const filteredDMs = users.filter(u => 
    u.id !== currentUser.id &&
    (u.name.toLowerCase().includes(dmSearch.toLowerCase()) || 
     u.username.toLowerCase().includes(dmSearch.toLowerCase()))
  );

  return (
    <div className="w-72 border-r border-white/[0.08] bg-[#111827] flex flex-col h-full select-none">
      
      {/* DevTalk Terminal header logo */}
      <div className="h-16 border-b border-white/[0.08] px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Terminal className="text-indigo-400 w-5.5 h-5.5" />
          <h1 className="text-md font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            DevTalk Space
          </h1>
        </div>
        <div className="text-[9px] font-mono border border-slate-800 text-slate-500 rounded px-1">
          v1.0.0
        </div>
      </div>

      {/* Main logged-in user profile hub card */}
      <div className="p-4 border border-white/[0.08] mx-3 bg-white/[0.03] rounded-xl mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-800/80 cursor-pointer hover:brightness-95"
              onClick={() => setShowProfileModal(true)}
              referrerPolicy="no-referrer"
            />
            {/* Realtime status dot */}
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0b0f19] ${
              currentUser.status === "Online" ? "bg-emerald-400" : currentUser.status === "Away" ? "bg-amber-400" : "bg-slate-500"
            }`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <p className="text-xs font-bold text-slate-100 truncate max-w-[100px]">{currentUser.name}</p>
              <BadgeCheck className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 truncate">@{currentUser.username}</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-1">
          {/* Change status toggle selection */}
          <div className="relative group">
            <button className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-indigo-400 transition" title="Modify Presence">
              <Circle className="w-4 h-4 fill-current" />
            </button>
            {/* Tooltip menu */}
            <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 origin-top-right transition-all bg-slate-950 border border-slate-850 p-1.5 rounded-lg w-28 z-50 space-y-1 shadow-2xl">
              <button onClick={() => changePresenceStatus("Online")} className="w-full text-left p-1 text-xxs font-mono flex items-center space-x-1.5 hover:bg-slate-900 rounded text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Online</span>
              </button>
              <button onClick={() => changePresenceStatus("Away")} className="w-full text-left p-1 text-xxs font-mono flex items-center space-x-1.5 hover:bg-slate-900 rounded text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Away</span>
              </button>
              <button onClick={() => changePresenceStatus("Offline")} className="w-full text-left p-1 text-xxs font-mono flex items-center space-x-1.5 hover:bg-slate-900 rounded text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Offline</span>
              </button>
            </div>
          </div>

          <button 
            onClick={() => setShowProfileModal(true)}
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-indigo-400 transition"
            title="Profile Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav Link tabs - Chat and Statistics dashboard */}
      <div className="px-3 mt-4 space-y-1 select-none">
        <button
          onClick={() => onTabChange("chat")}
          className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "chat" ? "bg-[#6366f1]/10 text-[#22d3ee] font-bold" : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
          }`}
          id="chat-tab-nav"
        >
          <MessageSquare className="w-4 h-4 text-[#6366f1]" />
          <span>Active Rooms</span>
        </button>

        <button
          onClick={() => onTabChange("dashboard")}
          className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "dashboard" ? "bg-[#6366f1]/10 text-[#22d3ee] font-bold" : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
          }`}
          id="dashboard-tab-nav"
        >
          <LayoutDashboard className="w-4 h-4 text-[#6366f1]" />
          <span>Control Panel Stats</span>
        </button>
      </div>

      {/* Sidebar Navigation categories list wrapper */}
      <div className="flex-1 overflow-y-auto px-3 mt-4 space-y-5">
        
        {/* Category 1: General Global chat */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 mb-1.5">Networks</p>
          <button
            onClick={() => { onRoomSelect("global", "🌐 General Developer Room"); onTabChange("chat"); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              currentRoomId === "global" && activeTab === "chat" ? "bg-white/[0.04] text-[#22d3ee] font-bold border-l-2 border-[#6366f1]" : "text-slate-400 hover:bg-white/[0.02] hover:text-[#f1f5f9]"
            }`}
          >
            <Globe className="w-4 h-4 text-[#6366f1]" />
            <span className="truncate">General Dev Channel</span>
          </button>
        </div>

        {/* Category 2: Group clusters */}
        <div>
          <div className="flex justify-between items-center px-3 mb-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Private Groups</p>
            <button 
              onClick={() => setShowGroupModal(true)} 
              className="text-slate-500 hover:text-white transition"
              title="Form New Group"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {groups.length === 0 ? (
              <span className="text-[10px] font-mono text-slate-600 block px-3 py-1">No groups configured.</span>
            ) : (
              groups.map((grp) => (
                <button
                  key={grp.id}
                  onClick={() => { onRoomSelect(`group_${grp.id}`, `# ${grp.groupName}`); onTabChange("chat"); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    currentRoomId === `group_${grp.id}` && activeTab === "chat" ? "bg-white/[0.04] text-[#22d3ee] font-bold border-l-2 border-[#6366f1]" : "text-slate-400 hover:bg-white/[0.02] hover:text-[#f1f5f9]"
                  }`}
                >
                  <FolderGit2 className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
                  <span className="truncate">{grp.groupName}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Category 3: Direct Messaging */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 mb-1.5">Direct Messages</p>
          <div className="relative px-3 mb-2.5">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
            <input
              type="text"
              value={dmSearch}
              onChange={(e) => setDmSearch(e.target.value)}
              placeholder="Search developer..."
              className="w-full bg-[#1e293b]/50 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1 text-xxs focus:border-indigo-400 focus:outline-none placeholder-slate-500 font-mono text-slate-200"
            />
          </div>

          <div className="space-y-0.5">
            {filteredDMs.map((u) => {
              const dmRoomId = `p2p_${currentUser.id}_${u.id}`;
              const alternateRoomId = `p2p_${u.id}_${currentUser.id}`;
              const isSelected = (currentRoomId === dmRoomId || currentRoomId === alternateRoomId) && activeTab === "chat";

              return (
                <button
                  key={u.id}
                  onClick={() => { onRoomSelect(dmRoomId, `@ ${u.name}`); onTabChange("chat"); }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected ? "bg-white/[0.04] text-[#22d3ee] border-l-2 border-[#6366f1]" : "text-slate-400 hover:bg-slate-900/30 hover:text-[#f1f5f9]"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={u.avatar} alt={u.name} className="w-5.5 h-5.5 rounded-md object-cover" referrerPolicy="no-referrer" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#111827] ${
                      u.status === "Online" ? "bg-emerald-400" : u.status === "Away" ? "bg-amber-400" : "bg-slate-500"
                    }`} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="truncate block font-medium max-w-[140px]">{u.name}</span>
                  </div>
                </button>
              );
            })}
            {filteredDMs.length === 0 && (
              <span className="text-[10px] font-mono text-slate-600 block px-3 py-1">No other developers found.</span>
            )}
          </div>
        </div>

      </div>

      {/* Logout section */}
      <div className="p-4 border-t border-white/[0.08] bg-slate-950/25">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition"
          id="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Workspace</span>
        </button>
      </div>

      {/* Modal 1: Edit Profile details */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/[0.08] rounded-2xl glass p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center tracking-wide uppercase">
                <Settings className="w-4.5 h-4.5 text-[#6366f1] mr-2" />
                Compile profile specifications
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-sm focus:border-[#6366f1] focus:outline-none text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">Status Bio Details</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full h-16 bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-sm focus:border-[#6366f1] focus:outline-none resize-none text-slate-100 placeholder-slate-505"
                  placeholder="I compile dreams into software cascades..."
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">Skills Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  className="w-full bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-sm focus:border-[#6366f1] focus:outline-none text-slate-100"
                  placeholder="TypeScript, React, Golang, Python"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">GitHub Username</label>
                  <input 
                    type="text" 
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="w-full bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-xs focus:border-[#6366f1] focus:outline-none font-mono text-slate-100"
                    placeholder="octocat"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">LinkedIn Username</label>
                  <input 
                    type="text" 
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-xs focus:border-[#6366f1] focus:outline-none font-mono text-slate-100"
                    placeholder="octocat-profile"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white rounded-xl py-2.5 text-xs font-bold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>{profileSaving ? "Synthetically compilation..." : "Save Config Details"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Group */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/[0.08] rounded-2xl glass p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center uppercase tracking-wider">
                <Plus className="w-5 h-5 text-[#6366f1] mr-2" />
                Assemble Group Cluster
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xxs font-mono uppercase text-slate-400 mb-1">Group Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#1e293b]/45 border border-white/[0.08] px-3 py-2 rounded-xl text-sm focus:border-[#6366f1] focus:outline-none text-slate-100"
                  placeholder="Rust Core Discussers"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-slate-400 mb-1.5">Select Developers to Add</label>
                <div className="h-44 overflow-y-auto border border-white/[0.08] bg-[#0f172a]/80 rounded-xl p-2.5 space-y-1.5">
                  {users.filter(u => u.id !== currentUser.id).map(u => {
                    const isSelected = selectedGroupMembers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMemberSelection(u.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs leading-none transition-all ${
                          isSelected ? "bg-[#6366f1]/10 text-[#22d3ee] font-bold" : "hover:bg-slate-900/60 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded object-cover" referrerPolicy="no-referrer" />
                          <span className="font-semibold">{u.name} (@{u.username})</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#22d3ee]" />}
                      </button>
                    );
                  })}
                  {users.filter(u => u.id !== currentUser.id).length === 0 && (
                    <span className="text-xxs font-mono text-slate-600 block text-center py-10">Invite other developers to unlock selections.</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={groupSaving || !groupName.trim()}
                className="w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#6366f1]/90 hover:to-[#8b5cf6]/90 text-white rounded-xl py-2.5 text-xs font-bold tracking-wide transition select-none cursor-pointer"
              >
                <span>{groupSaving ? "Registering metadata..." : "Compile Cluster Group"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
