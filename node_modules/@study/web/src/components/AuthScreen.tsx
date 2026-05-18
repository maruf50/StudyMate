import { useState } from "react";
import type { FormEvent } from "react";

export type AuthMode = "login" | "signup";

type LoginPayload = { email: string; password: string };
type SignupPayload = {
  email: string;
  username: string;
  university: string;
  department: string;
  password: string;
};

type AuthScreenProps = {
  mode: AuthMode;
  error: string;
  isSubmitting: boolean;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (payload: LoginPayload) => Promise<void>;
  onSignup: (payload: SignupPayload) => Promise<void>;
};

const authHighlights = [
  "One place for study groups, notes, and chat.",
  "Pick login to resume your session or signup to create a new account.",
  "Logout clears the local session and returns you here."
];

export function AuthScreen({
  mode,
  error,
  isSubmitting,
  onModeChange,
  onLogin,
  onSignup
}: AuthScreenProps) {
  const [loginForm, setLoginForm] = useState<LoginPayload>({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState<SignupPayload>({
    email: "",
    username: "",
    university: "",
    department: "",
    password: ""
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "login") {
      await onLogin(loginForm);
      return;
    }

    await onSignup(signupForm);
  }

  return (
    <main className="auth-page">
      <section className="auth-hero panel">
        <p className="auth-kicker">StudyGroupFinder</p>
        <h1>Study together without losing your place.</h1>
        <p className="auth-copy">
          Sign in to resume your dashboard or create a new account to start tracking groups, notes, and sessions.
        </p>

        <ul className="auth-highlights">
          {authHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="auth-card panel">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <>
              <label>
                Username
                <input
                  value={signupForm.username}
                  onChange={(event) => setSignupForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Demo Student"
                  autoComplete="nickname"
                  required
                />
              </label>
              <label>
                University
                <input
                  value={signupForm.university}
                  onChange={(event) => setSignupForm((current) => ({ ...current, university: event.target.value }))}
                  placeholder="Northbridge University"
                  autoComplete="organization"
                  required
                />
              </label>
              <label>
                Department
                <input
                  value={signupForm.department}
                  onChange={(event) => setSignupForm((current) => ({ ...current, department: event.target.value }))}
                  placeholder="Computer Science"
                  autoComplete="organization-title"
                  required
                />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={mode === "login" ? loginForm.email : signupForm.email}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (mode === "login") {
                  setLoginForm((current) => ({ ...current, email: nextValue }));
                } else {
                  setSignupForm((current) => ({ ...current, email: nextValue }));
                }
              }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={mode === "login" ? loginForm.password : signupForm.password}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (mode === "login") {
                  setLoginForm((current) => ({ ...current, password: nextValue }));
                } else {
                  setSignupForm((current) => ({ ...current, password: nextValue }));
                }
              }}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="auth-link"
            onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </p>
      </section>
    </main>
  );
}