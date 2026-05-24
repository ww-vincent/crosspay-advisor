"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password);
      if (success) {
        router.push("/");
      } else {
        setError("Invalid username or password");
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#020202] relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Chain
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to continue</p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-8 backdrop-blur"
        >
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full rounded-xl border border-zinc-800 bg-[#020202] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-zinc-800 bg-[#020202] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 text-sm transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-5 text-center">
            <span className="text-xs text-zinc-600">
              Don&apos;t have an account?{" "}
            </span>
            <span className="text-xs text-zinc-500 cursor-default">
              Register (coming soon)
            </span>
          </div>
        </form>

        {/* Test credentials hint */}
        <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/40 px-4 py-3">
          <p className="text-[11px] text-zinc-600 text-center">
            Test accounts:{" "}
            <span className="font-mono text-zinc-400">test_stu</span> /{" "}
            <span className="font-mono text-zinc-400">111</span>
            &nbsp;&middot;&nbsp;
            <span className="font-mono text-zinc-400">test_worker</span> /{" "}
            <span className="font-mono text-zinc-400">222</span>
          </p>
        </div>
      </div>
    </div>
  );
}
