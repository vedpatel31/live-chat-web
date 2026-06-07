import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, Mic, Smile, Pin, Pencil, Trash2, Reply, Copy, Check, CheckCheck, 
  ChevronDown, FileText, Image as ImageIcon, FileArchive, Play, Pause, X, CornerDownRight, MicOff 
} from "lucide-react";
import { User, Message } from "../types";

interface ChatAreaProps {
  socket: any;
  currentUser: User;
  users: User[];
  currentRoomId: string;
  roomName: string;
  token: string | null;
}

export function ChatArea({ socket, currentUser, users, currentRoomId, roomName, token }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<any>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const typingTimerRef = useRef<any>(null);

  // Audio players caching
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Load message historical feed on room change
  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages/${currentRoomId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Error loading chat logs", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
    setReplyingTo(null);
    setEditingMessageId(null);
    setInputText("");

    // Listen to typing alerts specifically for this room
    setTypingUsers([]);
  }, [currentRoomId, token]);

  // Handle Socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { roomId: currentRoomId });

    const handleNewMessage = (msg: Message) => {
      // Validate or map replies references if needed
      setMessages((prev) => {
        // Prevent duplicate loads
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Scroll to bottom
      setTimeout(scrollBottom, 50);
    };

    const handleTypingStatus = (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (data.roomId !== currentRoomId) return;
      if (data.username === currentUser.username) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.includes(data.username)) return prev;
          return [...prev, data.username];
        } else {
          return prev.filter(u => u !== data.username);
        }
      });
    };

    const handleMessageEdited = (edited: Message) => {
      setMessages((prev) => prev.map(m => m.id === edited.id ? edited : m));
    };

    const handleMessageDeleted = (data: { id: string }) => {
      setMessages((prev) => prev.filter(m => m.id !== data.id));
    };

    const handleReactionUpdated = (data: { id: string; reactions: any[] }) => {
      setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, reactions: data.reactions } : m));
    };

    const handlePinToggled = (pinnedMsg: Message) => {
      setMessages((prev) => prev.map(m => m.id === pinnedMsg.id ? pinnedMsg : m));
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTypingStatus);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("reaction_updated", handleReactionUpdated);
    socket.on("pin_toggled", handlePinToggled);

    return () => {
      socket.emit("leave_room", { roomId: currentRoomId });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTypingStatus);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("reaction_updated", handleReactionUpdated);
      socket.off("pin_toggled", handlePinToggled);
    };
  }, [socket, currentRoomId, currentUser]);

  useEffect(() => {
    scrollBottom();
  }, [messages.length]);

  function scrollBottom() {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Handle typing emitters
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { roomId: currentRoomId, username: currentUser.username, isTyping: true });
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing", { roomId: currentRoomId, username: currentUser.username, isTyping: false });
    }, 2500);
  };

  // Trigger Send
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const isCode = inputText.startsWith("```") && inputText.endsWith("```");
    
    socket.emit("send_message", {
      roomId: currentRoomId,
      message: inputText,
      type: isCode ? "code" : "text",
      repliesTo: replyingTo ? replyingTo.id : null
    });

    setInputText("");
    setReplyingTo(null);

    // Stop typing ticker
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("typing", { roomId: currentRoomId, username: currentUser.username, isTyping: false });
    }
  };

  // Keyboard shortcut for saving inline edits
  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === "Escape") {
      setEditingMessageId(null);
    }
  };

  const saveEdit = (id: string) => {
    if (!editText.trim() || !socket) return;
    socket.emit("edit_message", { id, message: editText, roomId: currentRoomId });
    setEditingMessageId(null);
  };

  const triggerDelete = (id: string) => {
    if (!socket || !window.confirm("Check Delete: Permanent removal?")) return;
    socket.emit("delete_message", { id, roomId: currentRoomId });
  };

  const triggerReaction = (id: string, emoji: string) => {
    if (!socket) return;
    socket.emit("add_reaction", {
      id,
      emoji,
      userId: currentUser.id,
      username: currentUser.username,
      roomId: currentRoomId
    });
    setShowEmojiPicker(false);
  };

  const triggerPin = (id: string) => {
    if (!socket) return;
    socket.emit("toggle_pin", { id, roomId: currentRoomId });
  };

  // Copy code to Clipboard helper
  const copyToClipboard = (text: string, refStatus?: string) => {
    navigator.clipboard.writeText(text);
    alert(refStatus || "Snippet copied to stack clipboard.");
  };

  // --- AUDIO VOICE ME WORKFLOWS ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        
        // Auto-upload voice blob as stream
        setUploading(true);
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "x-file-name": encodeURIComponent(`voice_${Date.now()}.webm`),
              "x-file-type": "audio/webm"
            },
            body: audioBlob
          });
          const uploadData = await res.json();
          if (res.ok && socket) {
            socket.emit("send_message", {
              roomId: currentRoomId,
              message: "Voice memo transcript recorded",
              type: "voice",
              fileUrl: uploadData.fileUrl,
              fileName: "Voice Message",
              fileSize: uploadData.fileSize
            });
          }
        } catch (err) {
          console.error("Voice sync upload crashed", err);
        } finally {
          setUploading(false);
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone hardware block or denied interface", err);
      alert("Microphone connection denied. Check frame settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      // stop microphones tracks to disable visual recording dot in browser
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      setAudioBlob(null);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    }
  };

  const formatSeconds = (st: number) => {
    const mins = Math.floor(st / 60);
    const secs = st % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Play audio triggers
  const toggleAudioPlay = (id: string, url: string) => {
    const currentAudio = audioRefs.current.get(id);
    if (!currentAudio) return;

    if (playingAudioId === id) {
      currentAudio.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any previously playing
      if (playingAudioId) {
        const prev = audioRefs.current.get(playingAudioId);
        if (prev) prev.pause();
      }
      currentAudio.play();
      setPlayingAudioId(id);
      
      currentAudio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // --- STANDARD FILES TRANSMITTING WORKFLOW ---
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      // Send raw request stream
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-file-name": encodeURIComponent(file.name),
          "x-file-type": file.type || "application/octet-stream"
        },
        body: file
      });
      const data = await res.json();

      if (res.ok && socket) {
        const isImg = file.type.startsWith("image/");
        socket.emit("send_message", {
          roomId: currentRoomId,
          message: isImg ? `Shared an image: ${file.name}` : `Shared a file: ${file.name}`,
          type: "file",
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize
        });
      }
    } catch (err) {
      console.error("Binary file stream failed", err);
      alert("File transmission failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- PARSE AND FORMAT CODES & MARKDOWNS ---
  const renderMessageContent = (msg: Message) => {
    if (msg.type === "code") {
      // extract content
      let text = msg.message;
      if (text.startsWith("```")) {
        const firstLineEnd = text.indexOf("\n");
        const lang = text.slice(3, firstLineEnd).trim() || "Source Code";
        const content = text.slice(firstLineEnd + 1, text.length - 3).trim();
        return (
          <div className="space-y-1.5 mt-1.5 w-full max-w-2xl">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-t-lg px-4 py-1.5 text-xxs font-mono text-slate-400 select-none">
              <span className="uppercase text-indigo-400 font-semibold">{lang}</span>
              <button 
                onClick={() => copyToClipboard(content, "Code copied to clipboard.")}
                className="hover:text-white flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw</span>
              </button>
            </div>
            <pre className="code-block bg-slate-950 p-4 border-l-2 border-indigo-500 rounded-b-lg text-xs leading-relaxed text-indigo-200 overflow-x-auto text-[11px]">
              <code>{content}</code>
            </pre>
          </div>
        );
      }
    }

    if (msg.type === "file" && msg.fileUrl) {
      const isImage = msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      if (isImage) {
        return (
          <div className="mt-2.5 max-w-sm rounded-xl overflow-hidden border border-slate-800 bg-slate-950/20 group">
            <img 
              src={msg.fileUrl} 
              alt={msg.fileName || "Shared image"} 
              className="w-full max-h-64 object-contain group-hover:brightness-95 cursor-pointer"
              onClick={() => window.open(msg.fileUrl!, "_blank")}
              referrerPolicy="no-referrer"
            />
            <div className="p-3 bg-slate-950/40 text-xxs flex justify-between items-center select-none">
              <span className="truncate text-slate-400 max-w-[200px]">{msg.fileName}</span>
              <a 
                href={msg.fileUrl} 
                download={msg.fileName || "download"} 
                className="text-indigo-400 hover:underline font-bold"
              >
                Save Original
              </a>
            </div>
          </div>
        );
      }

      // ZIP, PDF, or Docs layout
      const sizeMb = msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : "Document";
      let IconRef = FileText;
      if (msg.fileName?.match(/\.(zip|tar|gz|rar)$/i)) IconRef = FileArchive;

      return (
        <div className="mt-2.5 p-4 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center space-x-4 max-w-md">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <IconRef className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{msg.fileName}</p>
            <span className="text-xxs font-mono text-slate-500">{sizeMb}</span>
          </div>
          <a
            href={msg.fileUrl}
            download={msg.fileName || "file"}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 hover:text-white transition text-xs font-semibold text-indigo-400 select-none text-center"
          >
            Download
          </a>
        </div>
      );
    }

    if (msg.type === "voice" && msg.fileUrl) {
      return (
        <div className="mt-2 flex items-center space-x-3 bg-slate-950/45 p-3 rounded-2xl border border-slate-850 max-w-sm select-none">
          <audio 
            ref={(el) => {
              if (el) audioRefs.current.set(msg.id, el);
            }} 
            src={msg.fileUrl} 
          />
          <button 
            onClick={() => toggleAudioPlay(msg.id, msg.fileUrl!)}
            className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition active:scale-95 flex-shrink-0"
          >
            {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xxs font-mono text-slate-500 leading-none mb-1">
              <span>DevTalk Wave</span>
              <span>Voice memo</span>
            </div>
            {/* Visual synthetic audio lines */}
            <div className="flex items-center space-x-0.5 h-3">
              <span className={`w-1 h-2 bg-indigo-500 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-1 h-3 bg-purple-500 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-1 h-1.5 bg-indigo-500 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-1 h-2 bg-cyan-400 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-1 h-4 bg-indigo-400 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-45"}`} />
              <span className={`w-1 h-2 bg-purple-500 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-1 h-1 bg-indigo-500 rounded-full ${playingAudioId === msg.id ? "animate-pulse" : "opacity-40"}`} />
            </div>
          </div>
        </div>
      );
    }

    // Default code snippet parsing (inline formatting e.g. `const v = 5`)
    const parts = msg.message.split(/(`[^`]+`)/g);
    if (parts.length > 1) {
      return (
        <p className="text-sm leading-relaxed text-slate-300 mt-1 whitespace-pre-wrap">
          {parts.map((part, idx) => {
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code key={idx} className="bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded font-mono text-xs text-purple-400">
                  {part.slice(1, -1)}
                </code>
              );
            }
            return part;
          })}
        </p>
      );
    }

    return (
      <p className="text-sm leading-relaxed text-slate-300 mt-1 whitespace-pre-wrap break-words">
        {msg.message}
      </p>
    );
  };

  // Filter pinned or queries on user request
  const filteredMessages = messages.filter(m => {
    if (showPinnedOnly && !m.isPinned) return false;
    if (searchQuery.trim() !== "") {
      return m.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (m.fileName && m.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative overflow-hidden">
      
      {/* Top Banner Control Panel */}
      <div className="h-16 border-b border-white/[0.08] bg-[#111827] flex justify-between items-center px-6 select-none z-20">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center">
            {roomName}
            {isRecording && (
              <span className="ml-3 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-mono rounded flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />
                [REC: {formatSeconds(recordingSeconds)}]
              </span>
            )}
          </h3>
          <p className="text-xxs text-[#22d3ee] font-mono mt-0.5 animate-pulse">
            // active scope: {currentRoomId}
          </p>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center space-x-3">
          {/* Search bar inside room */}
          <div className="relative hidden sm:block">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat..."
              className="bg-[#1e293b]/50 border border-white/[0.08] text-xs px-3 py-1 rounded-lg focus:border-[#6366f1] focus:outline-none w-36 font-mono text-slate-200 placeholder-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-350">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              showPinnedOnly ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/[0.04] text-slate-400 hover:text-white"
            }`}
            title="Display Pinned Messages"
          >
            <Pin className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Main Message Thread feed scroll */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-indigo-400 animate-pulse">
            Fetching cryptographic chat logs...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 select-none">
            <span className="text-3xl">💻</span>
            <h4 className="text-sm font-bold text-slate-300 mt-2">No messages to show.</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-mono">
              $ connect --room {currentRoomId} // Send a message to start real-time telemetry pipelines.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const senderObj = users.find(u => u.id === msg.senderId) || {
              name: "Offline Developer",
              username: "deleted",
              avatar: `https://ui-avatars.com/api/?name=OD&background=random&color=fff`
            };

            const isMe = msg.senderId === currentUser.id;
            const msgDateObj = new Date(msg.createdAt);
            const timeFormatted = msgDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={msg.id}
                className="group relative flex items-start space-x-3.5 p-3.5 rounded-2xl bg-transparent hover:bg-white/[0.02] transition-all border border-transparent hover:border-white/[0.05]"
              >
                
                {/* User Avatar */}
                <img 
                  src={senderObj.avatar} 
                  alt={senderObj.username} 
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-800/50"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  {/* Meta headers */}
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xs font-bold text-slate-100 hover:underline cursor-pointer">{senderObj.name}</span>
                    <span className="text-xxs font-mono text-slate-500">@{senderObj.username}</span>
                    <span className="text-xxs font-mono text-slate-600 font-semibold">{timeFormatted}</span>
                    
                    {msg.isPinned && (
                      <span className="text-[9px] bg-amber-500/15 border border-amber-500/20 text-amber-500 px-1 rounded flex items-center font-mono select-none">
                        <Pin className="w-2.5 h-2.5 mr-0.5 fill-current" /> PIN
                      </span>
                    )}
                  </div>

                  {/* Reply Reference Display */}
                  {msg.repliesTo && (
                    <div className="mt-1 px-3 py-1.5 border-l-2 border-indigo-500/60 bg-indigo-550/10 rounded-r-lg max-w-md text-xxs font-mono flex items-center text-slate-400">
                      <CornerDownRight className="w-3" />
                      <span className="ml-1.5 italic text-indigo-400 font-medium">Replying ID: {msg.repliesTo.substring(0, 7)}...</span>
                    </div>
                  )}

                  {/* Message body text / editor */}
                  {editingMessageId === msg.id ? (
                    <div className="mt-2 flex items-center space-x-2 w-full max-w-xl">
                      <input 
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                        className="flex-1 bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <button 
                        onClick={() => saveEdit(msg.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500 text-white text-xxs font-bold"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingMessageId(null)}
                        className="text-slate-500 text-xxs hover:text-slate-350"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    renderMessageContent(msg)
                  )}

                  {/* Message Reactions Drawer */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {msg.reactions.reduce((acc: any[], curr) => {
                        const existing = acc.find(a => a.emoji === curr.emoji);
                        if (existing) {
                          existing.count++;
                          existing.users.push(curr.username);
                        } else {
                          acc.push({ emoji: curr.emoji, count: 1, users: [curr.username] });
                        }
                        return acc;
                      }, []).map((reaction, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => triggerReaction(msg.id, reaction.emoji)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-slate-400 hover:border-indigo-400/50 hover:bg-indigo-500/15 flex items-center space-x-1 text-xs select-none transition"
                          title={`Clicked by: ${reaction.users.join(", ")}`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-xxs font-bold text-slate-500">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover overlay shortcuts toolbar */}
                <div className="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/95 border border-slate-800 rounded-lg p-1 shadow-lg flex items-center space-x-1.5 z-10 select-none">
                  
                  {/* Reaction trigger hover toolbar shortcut */}
                  <button 
                    onClick={() => triggerReaction(msg.id, "👍")}
                    className="p-1 text-slate-400 hover:text-white text-xs"
                    title="Thumbs Up"
                  >
                    👍
                  </button>
                  <button 
                    onClick={() => triggerReaction(msg.id, "🚀")}
                    className="p-1 text-slate-400 hover:text-white text-xs"
                    title="Launch"
                  >
                    🚀
                  </button>

                  <button 
                    onClick={() => { setReplyingTo(msg); setInputText(""); }}
                    className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
                    title="Reply message"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={() => copyToClipboard(msg.message, "Message text copied.")}
                    className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
                    title="Copy message"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={() => triggerPin(msg.id)}
                    className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
                    title="Toggle pin message"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {isMe && (
                    <>
                      <button 
                        onClick={() => { setEditingMessageId(msg.id); setEditText(msg.message); }}
                        className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
                        title="Edit inline"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => triggerDelete(msg.id)}
                        className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-red-400"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Typing Indicators feed */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 bg-slate-950/20 text-xxs font-mono text-indigo-400 italic select-none">
          ⚡ {typingUsers.join(", ")} {typingUsers.length === 1 ? "is typing..." : "are typing..."}
        </div>
      )}

      {/* Replying Status banner overlay */}
      {replyingTo && (
        <div className="mx-6 p-2.5 rounded-t-xl bg-indigo-950/40 border border-b-0 border-indigo-500/20 text-xxs font-mono flex justify-between items-center select-none text-slate-300">
          <div className="flex items-center max-w-xl truncate">
            <CornerDownRight className="w-4 text-indigo-450 mr-2" />
            <span>Replying to <b className="text-indigo-400">@{users.find(u => u.id === replyingTo.senderId)?.username}</b>: {replyingTo.message}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File Uploading and processing progress loader spinner */}
      {uploading && (
        <div className="mx-6 p-2.5 rounded-t-xl bg-cyan-950/35 border border-cyan-500/20 text-xxs font-mono text-cyan-400 flex items-center space-x-2 animate-pulse">
          <span className="inline-block w-2.5 h-2.5 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
          <span>Framer Sync: Piping file stream safely...</span>
        </div>
      )}

      {/* Text Input area bar */}
      <div className="p-4 border-t border-white/[0.08] bg-[#111827] select-none z-10 animate-[slideUp_0.1s_ease-out]">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2 relative">
          
          {/* File Trigger Icon */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-400 hover:text-white transition cursor-pointer"
            title="Upload Doc, PDF, Zip or Image"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelection}
            className="hidden"
            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.zip,.tar,.gz,.rar,.txt,.js,.jsx,.ts,.tsx,.json"
          />

          {/* Core Input box */}
          <input 
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={isRecording ? "Voice engine synchronized..." : "Type message, share code in ``` or type @username..."}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] text-sm rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1] text-[13px] font-sans"
            disabled={isRecording}
          />

          {/* Emoji toggle action */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-400 hover:text-white transition cursor-pointer"
              title="Add emojis"
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute right-0 bottom-14 p-2.5 rounded-2xl bg-[#0f172a] border border-white/[0.08] shadow-2xl flex grid grid-cols-6 gap-1 w-44 z-50 animate-[fadeIn_0.1s_ease-out]">
                {["👍", "💻", "🔥", "🚀", "🎉", "❤️", "💡", "⚠️", "🤔", "👀", "🛠️", "🎯"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-white/[0.04] rounded text-center text-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Micro Voice memos triggers */}
          {isRecording ? (
            <div className="flex items-center space-x-1 flex-shrink-0 animate-mic-pulse rounded-xl px-2.5 py-2.5 select-none text-white text-xs font-mono font-bold">
              <button 
                type="button" 
                onClick={stopRecording}
                className="flex items-center space-x-2"
                title="Save audio message"
              >
                <Mic className="w-4.5 h-4.5" />
                <span>SAVE</span>
              </button>
              <button 
                type="button" 
                onClick={cancelRecording}
                className="hover:text-red-300 ml-1"
                title="Discard audio message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-red-500/20 hover:text-red-400 transition cursor-pointer"
              title="Record Voice Memo"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Send Trigger */}
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:brightness-110 text-white transition font-semibold cursor-pointer"
            title="Transmit"
          >
            <Send className="w-4.5 h-4.5" />
          </button>

        </form>
      </div>
    </div>
  );
}
