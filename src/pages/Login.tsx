import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Shield, Loader2, User, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlassCard as Card } from '@/shared/ui/GlassCard';

export const Login = () => {
  const { setEmployeeSession } = useAuth();
  const navigate = useNavigate();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'manager' | 'employee'>('manager');
  
  // Employee State
  const [empPhone, setEmpPhone] = useState('');
  const [empPin, setEmpPin] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleOAuthLogin = async (provider: 'google') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/onboarding'
      }
    });
    if (error) {
      toast.error('Giriş başarısız. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let cleanPhone = empPhone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const formattedPhone = `0${cleanPhone}`;

    if (cleanPhone.length !== 10) {
      toast.error('Geçerli 10 haneli bir telefon numarası girin.');
      setLoading(false);
      return;
    }

    if (empPin.length !== 6) {
      toast.error('PIN kodu 6 haneli olmalıdır.');
      setLoading(false);
      return;
    }

    // 1. Anonymous Login to establish a secure auth session
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error("Anonymous auth error:", anonError);
      toast.error('Güvenli oturum başlatılamadı.');
      setLoading(false);
      return;
    }

    // 2. Call the RPC to authenticate the PIN and link the session
    const { data: employeeData, error: rpcError } = await supabase.rpc('authenticate_employee', {
      p_phone: formattedPhone,
      p_pin: empPin
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
      
    } else {
      await supabase.auth.signOut();
      toast.error('Telefon veya PIN hatalı.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col relative bg-system-bg">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center pt-8 pb-4 sm:pt-12 sm:pb-6 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.35 }}
        >
          <div className="h-20 w-20 rounded-xl bg-system-surface shadow-sm flex items-center justify-center border border-system-border p-3">
            <img
              src="/bidefter_icon.svg"
              alt="Bidefter"
              className="w-full h-full object-contain drop-shadow-sm rounded-lg"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 text-center"
        >
          <h1 className="text-title-1 font-bold text-text-primary tracking-tight">Bidefter</h1>
          <p className="mt-1 text-caption font-semibold text-text-secondary uppercase tracking-widest">Smart Business</p>
        </motion.div>
      </div>

      {/* Form Card */}
      <div className="flex-1 px-4 sm:px-6 md:max-w-md md:mx-auto md:w-full relative z-10 pb-6">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card padding="lg" className="w-full shadow-lg bg-system-surface">
            
            {/* Tabs */}
            <div className="flex bg-system-bg rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab('manager')}
                className={`flex-1 py-2.5 text-subhead font-bold rounded-md flex justify-center items-center gap-2 transition-all ${
                  activeTab === 'manager' ? 'bg-system-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Shield className="h-4 w-4" /> Yönetici
              </button>
              <button
                onClick={() => setActiveTab('employee')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md flex justify-center items-center gap-2 transition-all ${
                  activeTab === 'employee' ? 'bg-system-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-secondary'
                }`}
              >
                <User className="h-4 w-4" /> Personel
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'manager' ? (
                <motion.div
                  key="manager"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold text-text-primary">İşletme Sahibi Girişi</h2>
                  <p className="mt-1 text-sm font-medium text-text-secondary mb-6">
                    Yönetici hesabınızla giriş yapın
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={loading}
                      className="flex items-center justify-center gap-3 w-full bg-system-surface border border-gray-300 text-text-secondary rounded-md h-12 font-bold hover:bg-glass-highlight transition-colors shadow-sm disabled:opacity-50"
                    >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                      Google ile Giriş Yap
                    </button>
                  </div>
                </motion.div>

              ) : (

                <motion.div
                  key="employee"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold text-text-primary">Personel Girişi</h2>
                  <p className="mt-1 text-sm font-medium text-text-secondary mb-6">
                    Sadece rakamları kullanarak hızlıca girin
                  </p>

                  <form onSubmit={handleEmployeeLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-text-secondary uppercase ml-1">Telefon Numarası</label>
                      <div className="flex items-center px-4 bg-system-surface border-2 border-system-border rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-sm">
                        <span className="text-text-tertiary font-bold mr-2">+90</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="555..."
                          value={empPhone}
                          onChange={(e) => setEmpPhone(e.target.value.replace(/\D/g, ''))}
                          required
                          className="h-14 flex-1 bg-transparent text-lg font-bold text-text-primary outline-none placeholder:text-system-border"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      <label className="text-xs font-bold text-text-secondary uppercase ml-1">6 Hanelİ PIN Kodu</label>
                      <div className="flex items-center px-4 bg-system-surface border-2 border-system-border rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-sm">
                        <KeyRound className="h-5 w-5 text-text-tertiary mr-2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="••••••"
                          value={empPin}
                          onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ''))}
                          required
                          className="h-14 flex-1 bg-transparent text-2xl tracking-[0.5em] font-bold text-text-primary outline-none placeholder:text-system-border placeholder:tracking-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-secondary"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading || !empPhone || empPin.length !== 6}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="mt-6 bg-primary text-white rounded-xl h-14 flex items-center justify-center font-bold text-lg hover:bg-primary-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <User className="h-6 w-6 mr-2" />}
                      Sisteme Gir
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

          </Card>
        </motion.div>
      </div>
    </div>
  );
};
