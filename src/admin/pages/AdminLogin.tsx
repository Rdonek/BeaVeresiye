import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/api/supabase';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAdminAuth } from '../providers/AdminAuthProvider';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAdminAuth();

  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        toast.success('Admin paneline hoş geldiniz.');
        navigate('/admin');
      }
    } catch (err: any) {
      toast.error('Giriş başarısız! Lütfen e-posta ve şifrenizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-system-bg">

      {/* ── Brand Header ── */}
      <div className="flex flex-col items-center pt-20 pb-10">
        {/* Logo — compact & clean */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.35 }}
        >
          <img
            src="/bidefter_icon.svg"
            alt="BiDefter"
            className="h-16 w-16 rounded-lg object-contain shadow-premium"
          />
        </motion.div>

        {/* App name + tagline */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-5 text-center"
        >
          <h1 className="font-large-title text-text-primary">BiDefter</h1>
          <p className="mt-1 font-subhead text-text-tertiary">Sistem Yönetim Paneli</p>
        </motion.div>

        {/* Admin badge */}
        <motion.div
          initial={{ y: 8, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-system-muted bg-system-surface px-4 py-1.5 shadow-premium"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />
          <span className="font-caption text-text-secondary">Süper Admin</span>
        </motion.div>
      </div>

      {/* ── Form Card ── */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mx-4 flex-1 rounded-t-2xl bg-system-surface px-5 pt-8 pb-6 shadow-premium-hover"
      >
        {/* Section title */}
        <h2 className="font-title-2 text-text-primary">Yönetici Girişi</h2>
        <p className="mt-1 font-subhead text-text-tertiary">
          Devam etmek için admin bilgilerinizi girin
        </p>

        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">

          {/* Email */}
          <div
            className={`flex items-center rounded-xl border bg-system-bg px-4 transition-all ${
              focusedField === 'email'
                ? 'border-primary ring-1 ring-primary/20'
                : 'border-system-muted'
            }`}
          >
            <input
              id="admin-login-email"
              type="email"
              placeholder="Admin E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
              autoComplete="username"
              className="h-14 flex-1 bg-transparent font-body text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>

          {/* Password */}
          <div
            className={`flex items-center rounded-xl border bg-system-bg px-4 transition-all ${
              focusedField === 'password'
                ? 'border-primary ring-1 ring-primary/20'
                : 'border-system-muted'
            }`}
          >
            <input
              id="admin-login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              required
              autoComplete="current-password"
              className="h-14 flex-1 bg-transparent font-body text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors active:bg-system-muted active:text-text-secondary"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !email || !password}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-white shadow-pill transition-all active:bg-primary-hover disabled:bg-system-muted disabled:text-text-tertiary disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Doğrulanıyor...</span>
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Security notice */}
        <div className="mt-10 flex justify-center pb-4">
          <div className="flex items-center gap-2 text-text-tertiary">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-caption uppercase tracking-wider">Yetkili Erişim Noktası</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
