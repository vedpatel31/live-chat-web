import React, { useState, useEffect } from "react";
import { ShieldCheck, Eye, EyeOff, LayoutTemplate, Github, ArrowRight, Activity, Terminal } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI states
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  // Password strength validation variables
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthText, setStrengthText] = useState("Weak");
  const [strengthColor, setStrengthColor] = useState("bg-red-500");

  useEffect(() => {
    if (!password) {
      setStrengthScore(0);
      setStrengthText("");
      return;
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    setStrengthScore(score);

    if (score <= 1) {
      setStrengthText("Weak");
      setStrengthColor("bg-red-500 w-1/4");
    } else if (score === 2) {
      setStrengthText("Medium");
      setStrengthColor("bg-yellow-500 w-2/4");
    } else if (score === 3) {
      setStrengthText("Strong");
      setStrengthColor("bg-emerald-400 w-3/4");
    } else {
      setStrengthText("Extremely Secure");
      setStrengthColor("bg-purple-400 w-full");
    }
  }, [password]);

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isLogin) {
      // Register validation
      if (!name.trim() || !username.trim() || !email.trim() || !password) {
        setError("Please complete all fields");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }
    } else {
      // Login validation
      if (!email || !password) {
        setError("Please fill in all details");
        setLoading(false);
        return;
      }
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin 
      ? { emailOrUsername: email, password }
      : { name, username: username.toLowerCase().replace(/\s/g, ""), email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Review credentials.");
      }

      setLoading(false);
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Could not reach the authentication server");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.1),rgba(255,255,255,0))] text-[#f8fafc] font-sans px-4 select-none">
      <div className="w-full max-w-md">
        {/* Logo / Header Branding */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[#f8fafc] mb-3">
            <Terminal className="w-6 h-6" />
            <div className="absolute -right-1 -top-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a] bg-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#f8fafc]">
            DevTalk Space
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Secure workspace for developer communication
          </p>
        </div>

        {/* Outer Form Container with Glass Effect */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#111827] space-y-6 shadow-2xl">
          <div className="flex border-b border-white/[0.08] pb-1">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                isLogin ? "border-[#6366f1] text-[#22d3ee] font-extrabold" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              id="login-tab-btn"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                !isLogin ? "border-[#6366f1] text-[#22d3ee] font-extrabold" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              id="register-tab-btn"
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {error && (
              <div className="p-3.5 text-xs font-mono rounded-lg border border-red-500/20 bg-red-950/40 text-red-400 animate-[fadeIn_0.2s_ease-out]">
                ⚠️ [Error]: {error}
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alan Kay"
                    className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none placeholder-slate-600 transition text-slate-100"
                    id="auth-input-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Developer Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="alankay8"
                    className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none placeholder-slate-600 transition text-slate-100"
                    id="auth-input-username"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
                {isLogin ? "Username or Email" : "Email Address"}
              </label>
              <input
                type={isLogin ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLogin ? "developer@devtalk.com" : "you@devtalk.com"}
                className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none placeholder-slate-600 transition text-slate-100"
                id="auth-input-email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                    className="text-xs text-[#6366f1] hover:underline cursor-pointer"
                    id="forgot-password-btn"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none placeholder-slate-600 transition text-slate-100"
                  id="auth-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  id="toggle-password-v"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {!isLogin && password && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between text-xxs font-mono text-slate-400">
                    <span>Password Strength:</span>
                    <span className="font-bold text-[#6366f1]">{strengthText}</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthColor}`} />
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0f172a] border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none placeholder-slate-600 transition text-slate-100"
                    id="auth-input-confirm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    id="toggle-confirm-pass"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me bar */}
            {isLogin && (
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="rounded border-white/[0.08] bg-[#0f172a] text-[#6366f1] focus:ring-[#6366f1] focus:ring-offset-[#0f172a] cursor-pointer"
                    id="remember-me-checkbox"
                  />
                  <span>Remember my terminal token</span>
                </label>
              </div>
            )}

            {forgotPasswordMsg && (
              <div className="p-3.5 text-xs font-mono rounded-lg bg-[#6366f1]/10 border border-white/[0.08] text-indigo-300 animate-[fadeIn_0.2s_ease-out]">
                💡 <b>Security Tip:</b> In local offline development, passwords are cryptographically salted & hashed with bcrypt. If you forgot your password of a local account, register a new profile.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:brightness-110 text-[#f8fafc] rounded-xl py-3 text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              id="auth-submit-btn"
            >
              <span>{loading ? "Establishing handshake..." : isLogin ? "Let's Begin" : "Initialize Developer Environment"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick instructions/credits */}
          <div className="pt-4 border-t border-white/[0.08] text-center text-slate-500 text-[10px] uppercase font-mono">
            DevTalk Collaborative Platform v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
