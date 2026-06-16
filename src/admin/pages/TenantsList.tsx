import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronRight, Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { useAdminTenants } from '../hooks/useAdmin';

export const TenantsList = () => {
  const navigate = useNavigate();
  const { data: tenants = [], isLoading: loading } = useAdminTenants();

  return (
    <div className="min-h-screen p-6 pt-12 pb-24 bg-system-bg">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="font-subhead text-text-secondary tracking-tight uppercase">Yönetim</h2>
          <h1 className="font-large-title text-text-primary mt-1">İşletmeler</h1>
        </div>
        <Button onClick={() => navigate('/admin/tenants/new')} size="sm" className="rounded-full h-12 w-12 p-0 flex items-center justify-center shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex py-12 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={t.id} 
              onClick={() => navigate(`/admin/tenants/${t.id}`)}
              className="premium-card p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-headline text-text-primary">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-caption text-text-tertiary">{t.subdomain}.bidefter</p>
                    <span className="w-1 h-1 rounded-full bg-system-muted"></span>
                    <p className="font-caption text-primary">SMS: {t.sms_credits || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${t.status === 'suspended' ? 'bg-danger' : 'bg-success'}`}></div>
                <ChevronRight className="h-5 w-5 text-text-tertiary opacity-50" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
