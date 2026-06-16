import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { motion } from 'framer-motion';
import { Wallet, QrCode, Plus, ArrowDownLeft, ArrowUpRight, Package, ArrowRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/widgets/Header';
import { QuickVeresiyeModal } from '@/widgets/QuickVeresiyeModal';
import { EmptyState } from '@/shared/ui/EmptyState';

export const Dashboard = () => {
  const { tenantId, tenantName } = useTenant();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailySales: 0,
    customerDebt: 0,
    lowStockItems: 0
  });
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [isVeresiyeModalOpen, setIsVeresiyeModalOpen] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchDashboardData();
    }
  }, [tenantId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data: salesData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('type', 'sale')
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay.toISOString());

      const dailySales = salesData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      const { data: customersData } = await supabase
        .from('customers')
        .select('balance')
        .eq('tenant_id', tenantId)
        .gt('balance', 0);

      const customerDebt = customersData?.reduce((sum, c) => sum + Number(c.balance), 0) || 0;

      const { count: lowStockCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .lte('stock_quantity', 5);

      const { data: recentTxsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTxs(recentTxsData || []);

      setStats({
        dailySales,
        customerDebt,
        lowStockItems: lowStockCount || 0
      });
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const actionButtons = [
    { id: 'pos', icon: QrCode, label: 'Hızlı Satış', bg: 'bg-primary border border-primary shadow-md shadow-primary/20', text: 'text-gray-800 font-bold', iconColor: 'text-white', action: () => navigate('/pos') },
    { id: 'veresiye', icon: Plus, label: 'Veresiye Yaz', bg: 'bg-white border border-red-200 shadow-sm', text: 'text-gray-800 font-bold', iconColor: 'text-red-500', action: () => setIsVeresiyeModalOpen(true) },
    { id: 'receive', icon: ArrowDownLeft, label: 'Tahsilat', bg: 'bg-white border border-gray-200 shadow-sm', text: 'text-gray-800 font-bold', iconColor: 'text-gray-700', action: () => navigate('/customers') },
    { id: 'expense', icon: Wallet, label: 'Masraf Gir', bg: 'bg-white border border-gray-200 shadow-sm', text: 'text-gray-800 font-bold', iconColor: 'text-gray-700', action: () => navigate('/transactions') },
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      <Header title="Özet" subtitle="İşletmenizin anlık durumu" />
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      
      {/* Premium Main Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        
        {/* Top Dark Card (Ciro) */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-xl shadow-slate-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col gap-1">
            <h2 className="text-slate-400 text-[11px] sm:text-xs font-bold tracking-[0.15em] uppercase">Bugünkü Kasa (Ciro)</h2>
            <div className="flex items-baseline gap-1 mt-1 flex-wrap">
              <span className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight break-all">
                {loading ? "..." : stats.dailySales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 ml-1">TL</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-1">
            <h3 className="text-gray-500 text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-1">Piyasadaki Alacak</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900 truncate">
                {loading ? "..." : stats.customerDebt.toLocaleString('tr-TR')}
              </span>
              <span className="text-sm font-bold text-gray-400">TL</span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-1">
            <h3 className="text-gray-500 text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-1">Azalan Stok</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900">
                {loading ? "..." : stats.lowStockItems} <span className="text-sm font-bold text-gray-400">Ürün</span>
              </span>
              {stats.lowStockItems > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions (Zarif, Orantılı Grid) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-2">
        <h3 className="text-[13px] font-bold text-gray-900 mb-3 ml-2 tracking-wide uppercase">Hızlı İşlemler</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-4 px-1">
          {actionButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={btn.action}
              className="flex flex-col items-center gap-2 sm:gap-3 group"
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-transform active:scale-90 ${btn.bg}`}>
                <btn.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${btn.iconColor}`} strokeWidth={2.5} />
              </div>
              <span className={`text-[12px] sm:text-xs text-center leading-tight ${btn.text}`}>
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col xl:flex-row gap-6 mt-4">
        {/* Recent Transactions list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-center ml-2 mr-2">
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wide uppercase">Son Hareketler</h3>
            <button onClick={() => navigate('/transactions')} className="text-[11px] font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider">Tümü</button>
          </div>
          
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col overflow-y-auto overflow-x-hidden max-h-[350px] custom-scrollbar relative">
            {loading ? (
              <div className="p-12 flex justify-center text-gray-300"><Wallet className="w-8 h-8 animate-pulse" /></div>
            ) : recentTxs.length === 0 ? (
              <div className="py-8">
                <EmptyState 
                  icon={Calendar} 
                  title="İşlem Yok" 
                  description="Henüz bir finansal hareket bulunmuyor." 
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80">
                {recentTxs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {tx.type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 pr-4">
                        <p className="font-bold text-[14px] sm:text-[15px] text-gray-900 truncate">
                          {tx.description || (tx.type === 'sale' ? 'Satış' : tx.type === 'income' ? 'Gelir' : 'Gider')}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5 truncate">
                          {tx.payment_method === 'cash' ? 'Nakit' : tx.payment_method === 'veresiye' ? 'Açık Hesap' : 'Kart'} • {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-black text-[15px] sm:text-[17px] shrink-0 ${tx.type === 'expense' ? 'text-gray-900' : 'text-green-600'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      </div>
      <QuickVeresiyeModal 
        isOpen={isVeresiyeModalOpen} 
        onClose={() => setIsVeresiyeModalOpen(false)} 
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};

