import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { motion } from 'framer-motion';
import { Wallet, QrCode, Plus, ArrowDownLeft, ArrowUpRight, Package, ArrowRight, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/widgets/Header';
import { QuickVeresiyeModal } from '@/widgets/QuickVeresiyeModal';
import { EmptyState } from '@/shared/ui/EmptyState';
import { DataList } from '@/shared/ui/DataList';
import { Button } from '@/shared/ui/Button';
import { HeroCard } from '@/shared/ui/HeroCard';

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
    { id: 'pos', icon: QrCode, label: 'Hızlı Satış', bg: 'bg-primary border border-primary shadow-sm', text: 'text-text-primary font-bold', iconColor: 'text-white', action: () => navigate('/pos') },
    { id: 'veresiye', icon: Plus, label: 'Veresiye Yaz', bg: 'bg-system-surface border border-system-border shadow-sm', text: 'text-text-primary font-bold', iconColor: 'text-red-500', action: () => setIsVeresiyeModalOpen(true) },
    { id: 'receive', icon: ArrowDownLeft, label: 'Tahsilat', bg: 'bg-system-surface border border-system-border shadow-sm', text: 'text-text-primary font-bold', iconColor: 'text-text-secondary', action: () => navigate('/customers') },
    { id: 'expense', icon: Wallet, label: 'Masraf Gir', bg: 'bg-system-surface border border-system-border shadow-sm', text: 'text-text-primary font-bold', iconColor: 'text-text-secondary', action: () => navigate('/transactions') },
  ];

  return (
    <div className="flex flex-col h-full w-full gap-4 lg:gap-6 pb-2 overflow-hidden">
      <Header title="Özet" subtitle="İşletmenizin anlık durumu" />
      
      <div className="flex flex-col gap-4 lg:gap-6 shrink-0">
          
        {/* Unified Hero Stats Card (Matching Kasa) */}
        <HeroCard>
          <HeroCard.Header 
            title="Bugünkü Kasa (Ciro)" 
            value={loading ? "..." : stats.dailySales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
            unit="TL" 
          />
          <HeroCard.Grid>
            <HeroCard.Stat 
              title="Piyasadaki Alacak" 
              value={loading ? "..." : stats.customerDebt.toLocaleString('tr-TR')} 
              unit="TL" 
            />
            <HeroCard.Stat 
              title="Azalan Stok" 
              value={loading ? "..." : stats.lowStockItems} 
              unit="Ürün" 
              isRight={true}
              indicator={stats.lowStockItems > 0 && <span className="w-2 h-2 rounded-full bg-danger shadow-sm animate-pulse ml-1"></span>}
            />
          </HeroCard.Grid>
        </HeroCard>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button onClick={() => navigate('/pos')} variant="primary" size="sm" fullWidth>
            <QrCode className="w-4 h-4 mr-1.5" /> Hızlı Satış
          </Button>
          <Button onClick={() => setIsVeresiyeModalOpen(true)} variant="danger" size="sm" fullWidth>
            <Plus className="w-4 h-4 mr-1.5" /> Veresiye Yaz
          </Button>
          <Button onClick={() => navigate('/customers')} variant="secondary" size="sm" fullWidth>
            <ArrowDownLeft className="w-4 h-4 mr-1.5 text-success" /> Tahsilat
          </Button>
          <Button onClick={() => navigate('/transactions')} variant="secondary" size="sm" fullWidth>
            <Wallet className="w-4 h-4 mr-1.5 text-text-tertiary" /> Masraf Gir
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col flex-1 min-h-0 gap-2 lg:gap-3">
        <DataList 
          header={
            <div className="flex justify-between items-center w-full">
              <h3 className="text-caption lg:text-subhead font-bold text-text-secondary tracking-wide uppercase">Son Hareketler</h3>
              <Button onClick={() => navigate('/transactions')} variant="ghost" size="sm" className="text-primary hover:bg-primary/10 uppercase tracking-wider text-[10px] lg:text-caption px-2 py-1">Tümü</Button>
            </div>
          }
        >
          {loading ? (
            <div className="flex-1 h-full flex items-center justify-center py-20 text-text-tertiary">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
          ) : recentTxs.length === 0 ? (
            <div className="flex-1 h-full flex items-center justify-center py-8">
              <EmptyState 
                icon={Calendar} 
                title="İşlem Yok" 
                description="Henüz bir finansal hareket bulunmuyor." 
              />
            </div>
          ) : (
            <div className="divide-y divide-system-border/50">
              {recentTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-glass-highlight transition-colors cursor-pointer group" onClick={() => navigate('/transactions')}>
                  <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                    <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors border border-system-border/50 group-hover:bg-primary/5 ${tx.type === 'expense' ? 'text-danger' : 'text-success'}`}>
                      {tx.type === 'expense' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="font-semibold text-body text-text-primary truncate capitalize">
                        {tx.description || (tx.type === 'sale' ? 'Satış' : tx.type === 'income' ? 'Gelir' : 'Gider')}
                      </p>
                      <p className="text-caption text-text-secondary font-medium mt-0.5 truncate flex gap-2">
                        <span className="flex-shrink-0">{new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="mx-2 text-system-border">•</span>
                        <span>{tx.payment_method === 'cash' ? 'Nakit' : tx.payment_method === 'veresiye' ? 'Açık Hesap' : 'Kart'}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold text-title-3 flex-shrink-0 ${tx.type === 'expense' ? 'text-text-primary' : 'text-success'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                </div>
              ))}
            </div>
          )}
        </DataList>
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

