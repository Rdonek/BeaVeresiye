import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Eye, EyeOff, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlassCard as Card } from '@/shared/ui/GlassCard';

export const Login = () => {
  const { tenantName } = useTenant();
  const { setEmployeeSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const finalInput = email.trim();
    const isPhone = /^\d+$/.test(finalInput.replace(/\s/g, ''));
    let cleanPhone = finalInput.replace(/\D/g, '');
    let formattedPhone = finalInput;

    if (isPhone) {
      if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      formattedPhone = `0${cleanPhone}`;
    }

    const { data: authData } = await supabase.auth.signInWithPassword({
      email: finalInput,
      password,
    });

    if (authData?.user) {
      toast.success('Giriş başarılı...');
      navigate('/');
      setLoading(false);
      return;
    }

    if (isPhone) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      
      if (anonError) {
        console.error("Anonymous auth error:", anonError);
        toast.error('Bağlantı hatası.');
        setLoading(false);
        return;
      }

      const { data: employeeData, error: rpcError } = await supabase.rpc('login_employee_session', {
        p_phone: formattedPhone,
        p_password: password
      });

      if (employeeData && !rpcError) {
        setEmployeeSession(employeeData);
        toast.success(`Hoş geldin, ${employeeData.name}`);
        
        const p = employeeData.permissions;
        if (p.dashboard) navigate('/');
        else if (p.pos) navigate('/pos');
        else if (p.inventory) navigate('/inventory');
        else if (p.customers) navigate('/customers');
        else navigate('/settings');
        
        setLoading(false);
        return;
      } else {
        await supabase.auth.signOut();
      }
    }

    toast.error('Giriş başarısız. Bilgilerinizi kontrol edin.');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden bg-gray-50">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center pt-24 pb-12 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.35 }}
        >
          <div className="h-20 w-20 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-200 p-3">
            <img
              src="/beaveresiye_icon.svg"
              alt="BeaVeresiye"
              className="w-full h-full object-contain drop-shadow-sm rounded-lg"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">BeaVeresiye</h1>
          <p className="mt-1 text-sm font-semibold text-gray-500 uppercase tracking-widest">Smart Business</p>
        </motion.div>

        <AnimatePresence>
          {tenantName && tenantName !== 'Demo Bakkal' && (
            <motion.div
              initial={{ y: 8, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-2 shadow-sm"
            >
              <Store className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">{tenantName}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Card */}
      <div className="flex-1 px-4 sm:px-6 md:max-w-md md:mx-auto md:w-full relative z-10 pb-10">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card padding="lg" className="w-full shadow-lg border-gray-200 bg-white">
            <h2 className="text-xl font-bold text-gray-900">Tekrar Hoş Geldiniz</h2>
            <p className="mt-1 text-sm font-medium text-gray-500 mb-8">
              Hesabınıza giriş yapın
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">

              <div className="flex items-center px-4 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-sm">
                <input
                  id="login-identifier"
                  type="text"
                  placeholder="E-posta veya Telefon Numarası"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-12 flex-1 bg-transparent font-medium text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center px-4 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-sm">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 flex-1 bg-transparent font-medium text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="mt-4 bg-primary text-white rounded-md h-12 flex items-center justify-center font-bold hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  <>
                    <span>Giriş Yap</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">veya</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 border border-transparent hover:border-gray-200 shadow-sm"
              >
                <Shield className="h-5 w-5 text-gray-400" />
                Sistem Yöneticisi Girişi
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
