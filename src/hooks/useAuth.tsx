'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'employee' | 'payer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ---- Fetch user role from DB ----
  const getUserRole = async (userId: string) => {
    try {
      // race the DB call against a timeout to avoid hanging the app
      const fetchPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const result = (await Promise.race([
        fetchPromise,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('Role fetch timeout')), 5000)
        ),
      ])) as { data: any; error: any };

      if (result?.error) {
        console.error('Role fetch error:', result.error);
        return null;
      }

      return (result?.data?.role ?? null) as UserRole | null;
    } catch (err) {
      console.error('getUserRole failed:', err);
      return null;
    }
  };

  // ---- Initial load + tab resume fix ----
  useEffect(() => {
    let ignore = false;
    const tokenRef = { current: null as string | null };

    const init = async () => {
      setLoading(true);
      try {
        // Always fetch latest session
        const { data } = await supabase.auth.getSession();
        if (ignore) return;

        const sess = data.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);
        tokenRef.current = sess?.access_token ?? null;

        if (sess?.user) {
          const r = await getUserRole(sess.user.id);
          if (!ignore) setRole(r);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('init auth failed:', err);
        if (!ignore) setRole(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    init();

    // Auth listener (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (ignore) return;

        // avoid handling the same token multiple times
        const newToken = newSession?.access_token ?? null;
        if (newToken && newToken === tokenRef.current) {
          // ensure loading is cleared, but skip heavy work
          if (!ignore) setLoading(false);
          return;
        }

        tokenRef.current = newToken;

        try {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            const r = await getUserRole(newSession.user.id);
            if (!ignore) setRole(r);
          } else {
            setRole(null);
          }
        } catch (err) {
          console.error('onAuthStateChange handler failed:', err);
          if (!ignore) setRole(null);
        } finally {
          if (!ignore) setLoading(false);
        }
      }
    );

    return () => {
      ignore = true;
      try {
        sub.subscription.unsubscribe();
      } catch (_) {
        // ignore unsubscribe errors
      }
    };
  }, []);

  // ----------------------
  // SIGN IN
  // ----------------------
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) navigate('/dashboard');
    return { error };
  };

  // ----------------------
  // SIGN UP
  // ----------------------
  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { error };

    if (data.user?.confirmed_at) {
      await supabase.auth.signInWithPassword({ email, password });
    }

    navigate('/dashboard');
    return { error: null };
  };

  // ----------------------
  // SIGN OUT
  // ----------------------
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    navigate('/auth/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, session, role, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
