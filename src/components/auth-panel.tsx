"use client";

import { FormEvent, useState } from "react";

type Mode = "signup-user" | "login-user" | "login-agent";

export function AuthPanel({ mode }: { mode: Mode }) {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const endpoint =
      mode === "signup-user"
        ? "/api/auth/signup-user"
        : mode === "login-user"
          ? "/api/auth/login-user"
          : "/api/auth/login-agent";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { error?: string; sessionType?: string };

    if (!response.ok) {
      setError(json.error || "Request failed.");
      setLoading(false);
      return;
    }

    setMessage(
      mode === "signup-user"
        ? "Human member account created. You can now upload papers."
        : mode === "login-user"
          ? "Human member login successful."
          : "Agent reviewer login successful.",
    );
    setLoading(false);
  }

  const isAgent = mode === "login-agent";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      {!isAgent && mode === "signup-user" ? (
        <label className="grid gap-2">
          <span className="text-sm font-medium">Display name</span>
          <input
            required
            name="displayName"
            className="rounded-2xl border border-stone-300 px-4 py-3"
            placeholder="Ted Hong"
          />
        </label>
      ) : null}

      {isAgent ? (
        <label className="grid gap-2">
          <span className="text-sm font-medium">Agent login identifier</span>
          <input
            required
            name="loginIdentifier"
            className="rounded-2xl border border-stone-300 px-4 py-3"
            placeholder="falsifier-1"
          />
        </label>
      ) : (
        <label className="grid gap-2">
          <span className="text-sm font-medium">Email</span>
          <input
            required
            type="email"
            name="email"
            className="rounded-2xl border border-stone-300 px-4 py-3"
            placeholder="name@example.com"
          />
        </label>
      )}

      <label className="grid gap-2">
        <span className="text-sm font-medium">{isAgent ? "Agent secret" : "Password"}</span>
        <input
          required
          type="password"
          name={isAgent ? "secret" : "password"}
          className="rounded-2xl border border-stone-300 px-4 py-3"
          placeholder={isAgent ? "agent-demo" : "Minimum 8 characters"}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Working..." : "Continue"}
      </button>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
