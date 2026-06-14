import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, MessageSquare, ArrowRight, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminStats } from '../hooks/useAdmin';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: loading } = useAdminStats();

  return (
    <div className="min-h-screen p-6 pt-12 pb-24 bg-system-bg">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="font-subhead text-text-secondary tracking-tight uppercase">Super Admin</h2>
        <h1 className="font-large-title text-text-primary mt-1">Sistem Özeti</h1>
      </motion.div>

      {/* Primary Metric */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-2xl shadow-premium p-6 bg-primary text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-subhead text-primary-light/80">Sistemdeki Toplam İşletme</span>
          <div className="p-2 bg-white/10 rounded-xl">
            <Users className="h-5 w-5 text-white" />
          </div>
        </div>
        {loading ? (
          <div className="h-10 w-24 bg-white/10 animate-pulse rounded-lg mt-1"></div>
        ) : (
          <div className="font-large-title tracking-tight">{stats?.totalTenants} Adet</div>
        )}
        
        <div className="mt-6 pt-4 border-t border-white/10">
          <button 
            onClick={() => navigate('/admin/tenants')}
            className="w-full flex items-center justify-between text-white/90 hover:text-white transition-colors"
          >
            <span className="font-subhead">Tüm İşletmeleri Gör</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Quick Action */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/admin/tenants/new')}
        className="w-full premium-card mb-8 p-4 flex items-center justify-between transition-colors group"
      >
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-system-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-headline text-text-primary">Yeni İşletme Ekle</p>
            <p className="font-caption text-text-secondary mt-0.5">Sisteme Müşteri Tanımla</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-text-tertiary group-hover:text-primary transition-colors" />
      </motion.button>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="premium-card p-5"
        >
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mb-4">
            <UserCheck className="h-5 w-5 text-success" />
          </div>
          <p className="font-caption text-text-secondary mb-1">Aktif İşletmeler</p>
          {loading ? (
            <div className="h-6 w-12 bg-system-muted animate-pulse rounded"></div>
          ) : (
            <p className="font-title-2 text-text-primary">{stats?.activeTenants}</p>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="premium-card p-5"
        >
          <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-5 w-5 text-warning" />
          </div>
          <p className="font-caption text-text-secondary mb-1">Satılan Toplam SMS</p>
          {loading ? (
            <div className="h-6 w-16 bg-system-muted animate-pulse rounded"></div>
          ) : (
            <p className="font-title-2 text-text-primary">{stats?.totalSmsCredits}</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
