import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/shared/api/supabase';

export type AppUserType = 'owner' | 'employee';

export interface AppUser {
  id: string;
  type: AppUserType;
  email?: string;
  name?: string;
  phone?: string;
  tenant_id?: string;
  permissions?: {
    pos: boolean;
    inventory: boolean;
    customers: boolean;
    dashboard: boolean;
  };
}

interface AuthContextType {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  setEmployeeSession: (employee: any) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  setEmployeeSession: () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there is an employee session in localStorage
    const employeeData = localStorage.getItem('employee_session');
    if (employeeData) {
      try {
        const emp = JSON.parse(employeeData);
        setUser({
          id: emp.id,
          type: 'employee',
          name: emp.name,
          phone: emp.phone,
          tenant_id: emp.tenant_id,
          permissions: emp.permissions
        });
        setIsLoading(false);
        return; // Skip supabase auth if employee
      } catch (e) {
        localStorage.removeItem('employee_session');
      }
    }

    // Get initial supabase session and latest user data
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Fetch the fresh user object from DB to ensure user_metadata is up-to-date
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        const meta = freshUser?.user_metadata || session.user.user_metadata || (session.user as any).raw_user_meta_data || {};
        setUser({ 
          id: session.user.id, 
          type: 'owner', 
          email: session.user.email,
          name: meta.name || meta.full_name || undefined
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        // Eğer kullanıcı anonimse (Çalışan)
        if ((session.user as any).is_anonymous) {
          const empData = localStorage.getItem('employee_session');
          if (empData) {
            try {
              const emp = JSON.parse(empData);
              setUser({
                id: emp.id,
                type: 'employee',
                name: emp.name,
                phone: emp.phone,
                tenant_id: emp.tenant_id,
                permissions: emp.permissions
              });
            } catch (e) {
              setUser(null);
            }
          } else {
            setUser(null); // LocalStorage'da data yoksa employee sayılmaz
          }
        } 
        // Anonim değilse (İşletme Sahibi)
        else {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          const meta = freshUser?.user_metadata || session.user.user_metadata || (session.user as any).raw_user_meta_data || {};
          setUser({ 
            id: session.user.id, 
            type: 'owner', 
            email: session.user.email,
            name: meta.name || meta.full_name || undefined
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setEmployeeSession = (employee: any) => {
    localStorage.setItem('employee_session', JSON.stringify(employee));
    setUser({
      id: employee.id,
      type: 'employee',
      name: employee.name,
      phone: employee.phone,
      tenant_id: employee.tenant_id,
      permissions: employee.permissions
    });
  };

  const signOut = async () => {
    localStorage.removeItem('employee_session');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, setEmployeeSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
