import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/api/supabase';

interface AdminAuthContextType {
  session: Session | null;
  user: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdmin = async (uid: string, email: string) => {
    const { data } = await supabase.from('super_admins').select('*').eq('id', uid).single();
    if (data) {
      setUser({ id: uid, email, name: data.name });
    } else {
      setUser(null);
      await supabase.auth.signOut();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user && !(session.user as any).is_anonymous) {
        checkAdmin(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user && !(session.user as any).is_anonymous) {
        checkAdmin(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider value={{ session, user, isLoading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
