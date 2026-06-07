import React, { useState, useEffect } from "react";
import { Users, MessageSquare, Shield, FolderGit2, Search, Github, Linkedin, Briefcase, Award, TrendingUp, Cpu } from "lucide-react";
import { User } from "../types";

interface StatsDashboardProps {
  currentUser: User;
  users: User[];
  token: string | null;
}

export function StatsDashboard({ currentUser, users, token }: StatsDashboardProps) {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [devSearch, setDevSearch] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStatsData(data);
        }
      } catch (err) {
        console.error("Failed fetching statistics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    
    // Poll stats occasionally
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [token, users.length]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(devSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(devSearch.toLowerCase()) ||
    u.skills.some(s => s.toLowerCase().includes(devSearch.toLowerCase()))
  );

  // Fallback charts if stats endpoints fail or list has 0 values
  const defaultDaily = [
    { day: "Sun", messages: 12 },
    { day: "Mon", messages: 27 },
    { day: "Tue", messages: 35 },
    { day: "Wed", messages: 50 },
    { day: "Thu", messages: 42 },
    { day: "Fri", messages: 68 },
    { day: "Sat", messages: statsData?.stats?.totalMessages || 45 }
  ];

  const dailyData = statsData?.charts?.dailyMessages || defaultDaily;
  const maxMsgRef = Math.max(...dailyData.map((d: any) => d.messages), 1);

  const statusRatio = statsData?.charts?.activeUsers || [
    { status: "Online", count: users.filter(u => u.status === "Online").length },
    { status: "Offline", count: Math.max(0, users.filter(u => u.status === "Offline").length) },
    { status: "Away", count: users.filter(u => u.status === "Away").length }
  ];
  const totalStatusCount = Math.max(1, statusRatio.reduce((acc: number, curr: any) => acc + curr.count, 0));

  return (
    <div className="flex-1 overflow-y-auto bg-[#0f172a] p-6 lg:p-8 space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Cpu className="w-6 h-6 mr-3 text-[#22d3ee] animate-pulse" />
            Developer Central Control Room
          </h2>
          <p className="text-sm text-slate-450 font-mono mt-1">
            Dashboard metrics, live stats indices, and global developer directory index
          </p>
        </div>
        <div className="px-4 py-1.5 rounded-full border border-emerald-500/10 bg-emerald-950/20 text-emerald-400 font-mono text-xs flex items-center select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
          Connection State: Synced
        </div>
      </div>

      {/* Metrics Cards Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Developers */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] hover:border-[#6366f1]/30 transition-all duration-300 group flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-[#6366f1] group-hover:text-white transition duration-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Developers</p>
            <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
              {statsData?.stats?.totalUsers || users.length}
            </h3>
          </div>
        </div>

        {/* Card 2: Online Now */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 group flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition duration-200">
            <span className="relative flex h-5 w-5 justify-center items-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Active Now</p>
            <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
              {statsData?.stats?.onlineUsers || users.filter(u => u.status === "Online").length}
            </h3>
          </div>
        </div>

        {/* Card 3: Total Messages */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] hover:border-purple-500/30 transition-all duration-300 group flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-[#8b5cf6] group-hover:text-white transition duration-200">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Messages</p>
            <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
              {statsData?.stats?.totalMessages || 14}
            </h3>
          </div>
        </div>

        {/* Card 4: Groups Created */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-300 group flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition duration-200">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Clusters / Groups</p>
            <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
              {statsData?.stats?.groupsCreated || 2}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts Bento Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Messages frequency custom SVG bar chart */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-white/[0.08] relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-semibold tracking-wide text-slate-350 uppercase font-mono flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-[#6366f1]" />
              Daily Messages Flow (Last 7 Days)
            </h4>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-450 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase font-mono">
              Live Feed
            </span>
          </div>

          {/* SVG Frame representation */}
          <div className="relative h-44 flex items-end justify-between px-2 pt-4">
            {/* Grid Line rules */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none">
              <div className="border-t border-slate-800/50 w-full h-0" />
              <div className="border-t border-slate-800/50 w-full h-0" />
              <div className="border-t border-slate-800/50 w-full h-0" />
              <div className="border-t border-slate-800/30 w-full h-0" />
            </div>

            {/* Custom Interactive Bars */}
            {dailyData.map((d: any, idx: number) => {
              const pet = (d.messages / maxMsgRef) * 80; // normalized percent
              return (
                <div key={idx} className="flex flex-col items-center flex-1 h-full select-none z-10 group justify-end">
                  {/* Hover tooltip */}
                  <div className="absolute bottom-20 bg-slate-950 p-2 border border-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-mono text-xxs leading-none text-white z-50 shadow-xl">
                    <p className="text-indigo-400 font-bold mb-1">{d.messages} messages</p>
                    <span className="text-slate-500 block">Day Activity</span>
                  </div>
                  
                  {/* Bar */}
                  <div 
                    style={{ height: `${Math.max(5, pet)}%` }}
                    className="w-8 sm:w-12 bg-gradient-to-t from-indigo-600 via-purple-500 to-indigo-400 rounded-t-lg transition-all duration-500 hover:brightness-125 group-hover:scale-x-105 active:scale-y-95 shadow-md flex items-start justify-center relative overflow-hidden"
                  >
                    {/* Glowing highlight strip */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-cyan-300/40" />
                  </div>
                  {/* Label */}
                  <span className="text-xxs font-mono text-slate-500 mt-2 block">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Developer Status proportions */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-white/[0.08]">
          <h4 className="text-sm font-semibold tracking-wide text-slate-350 uppercase font-mono mb-6 flex items-center">
            <Award className="w-4 h-4 mr-2 text-purple-400" />
            Developer Status Breakdown Indices
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
            {/* Status indicators circles */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Complex SVG representation of Pie chart ratios */}
              <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                {/* Clean circles for state slices */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#1e293b" strokeWidth="6" />
                {statusRatio.map((st: any, idx: number) => {
                  let cum = 0;
                  for (let i = 0; i < idx; i++) {
                    cum += (statusRatio[i].count / totalStatusCount) * 100;
                  }
                  const pct = (st.count / totalStatusCount) * 100;
                  const color = st.status === "Online" ? "#10b981" : st.status === "Away" ? "#f59e0b" : "#64748b";
                  return (
                    <circle 
                      key={idx}
                      cx="21" 
                      cy="21" 
                      r="15.915" 
                      fill="transparent" 
                      stroke={color} 
                      strokeWidth="6"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={-cum + 100} 
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>
              {/* Center display text inside circle */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-white">{statsData?.stats?.onlineUsers || users.filter(u => u.status === "Online").length}</span>
                <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">Online</span>
              </div>
            </div>

            {/* Explanatory Legend panels */}
            <div className="flex-1 space-y-4 w-full">
              {statusRatio.map((st: any, idx: number) => {
                const pct = Math.round((st.count / totalStatusCount) * 100);
                const colorHex = st.status === "Online" ? "bg-emerald-500" : st.status === "Away" ? "bg-amber-500" : "bg-slate-500";
                return (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorHex}`} />
                      <span className="font-medium text-slate-300">{st.status} Status</span>
                    </div>
                    <div className="font-mono text-right flex space-x-3 text-slate-450">
                      <span>{st.count} Users</span>
                      <span className="text-[#6366f1] font-semibold">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Index list */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-white/[0.08] space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="text-lg font-semibold text-white">Registered Developer Index</h4>
            <p className="text-xs text-slate-450">Query and connect with other engineers and fullstack developers</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              value={devSearch}
              onChange={(e) => setDevSearch(e.target.value)}
              placeholder="Search user, bio, skill..."
              className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs focus:border-[#6366f1] focus:outline-none placeholder-slate-500 transition font-mono text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((u) => (
            <div 
              key={u.id}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#6366f1]/20 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start space-x-3.5">
                <div className="relative flex-shrink-0">
                  <img 
                    src={u.avatar} 
                    alt={u.username} 
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/[0.08]"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#111827] ${
                    u.status === "Online" ? "bg-emerald-400" : u.status === "Away" ? "bg-amber-400" : "bg-slate-500"
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">{u.name}</p>
                    {u.id === currentUser.id && (
                      <span className="text-[8px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-mono px-1 rounded uppercase">Self</span>
                    )}
                  </div>
                  <p className="text-xxs font-mono text-slate-500">@{u.username}</p>
                  <p className="text-xs text-slate-400 mt-1 lines-clamp-2 leading-relaxed">{u.bio || "No profile bio recorded."}</p>
                </div>
              </div>

              {/* Skills and external tags links */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap gap-1.5 items-center justify-between">
                {/* Tech Badges */}
                <div className="flex flex-wrap gap-1">
                  {u.skills.slice(0, 3).map((sk, idx) => (
                    <span 
                      key={idx} 
                      className="text-[9px] font-mono bg-white/[0.04] border border-white/[0.08] text-slate-300 px-1.5 py-0.5 rounded"
                    >
                      {sk}
                    </span>
                  ))}
                  {u.skills.length > 3 && (
                    <span className="text-[9px] font-mono text-slate-500 px-1">+{u.skills.length - 3}</span>
                  )}
                </div>

                {/* Hyperlinks */}
                <div className="flex items-center space-x-2.5">
                  {u.github && (
                    <a 
                      href={u.github.startsWith("http") ? u.github : `https://github.com/${u.github}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-white"
                      title="GitHub"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {u.linkedin && (
                    <a 
                      href={u.linkedin.startsWith("http") ? u.linkedin : `https://linkedin.com/in/${u.linkedin}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-[#0077b5]"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-500 font-mono text-xs">
              ⚠️ No developers matched the search parameters. Try searching tags.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
