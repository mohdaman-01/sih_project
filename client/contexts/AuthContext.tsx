import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Role = "user" | "admin";
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: (roleHint?: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("auth:user");
    if (raw) setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  const signInWithGoogle = async (roleHint: Role = "user") => {
    // This mocks a Google sign-in; replace with real provider (e.g., Supabase/Firebase)
    const demoUser: AuthUser = {
      id: crypto.randomUUID(),
      name: roleHint === "admin" ? "Admin" : "User",
      email: roleHint === "admin" ? "admin@example.com" : "user@example.com",
      avatarUrl: undefined,
      role: roleHint,
    };
    setUser(demoUser);
    localStorage.setItem("auth:user", JSON.stringify(demoUser));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("auth:user");
  };

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
