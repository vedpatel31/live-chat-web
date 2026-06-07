import React from "react";

export function TerminalLoader({ message = "Compiling DevTalk server..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f172a] text-[#f1f5f9] px-4 font-mono">
      <div className="w-full max-w-md p-6 rounded-lg border border-white/[0.08] bg-[#111827] text-left space-y-4">
        {/* Terminal Header */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-slate-400 ml-2">devtalk@terminal:~</span>
        </div>
        
        {/* Terminal Body */}
        <div className="space-y-2 text-xs">
          <p className="text-emerald-400">$ node server.js --mode development</p>
          <p className="text-indigo-300">✓ Connected to Hybrid Developer Database</p>
          <p className="text-indigo-300">✓ Socket.io service initialized on port 3000</p>
          <div className="flex items-center space-x-2">
            <span className="text-[#8b5cf6] animate-pulse">⚙</span>
            <p className="text-slate-300 animate-pulse font-mono font-medium">{message}</p>
          </div>
        </div>

        {/* Dynamic Loading Meter */}
        <div className="w-full bg-slate-900 rounded-full h-1 my-3 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full w-2/3 rounded-full animate-[loading_1.5s_infinite_ease-in-out]" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="flex items-start space-x-3 p-4 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-10 h-10 rounded-full bg-slate-800" />
      {/* Thread lines skeleton */}
      <div className="flex-1 space-y-2 py-1">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-slate-800 rounded w-1/4" />
          <div className="h-3 bg-slate-900 rounded w-16" />
        </div>
        <div className="h-3 bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonMessage key={idx} />
      ))}
    </div>
  );
}
