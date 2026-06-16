import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Filter, ArrowUpRight, ArrowDownRight, ShoppingBag, Calendar, Loader2, Plus, Search, Trash2, Wallet, TrendingUp, TrendingDown, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/widgets/Header';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GlassCard as Card, GlassCard } from '@/shared/ui/GlassCard';
import { DataList } from '@/shared/ui/DataList';
import { FilterChip } from '@/shared/ui/FilterChip';
import { HeroCard } from '@/shared/ui/HeroCard';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useAddFinanceTransaction, useDeleteFinanceTransaction } from '@/shared/hooks/useFinance';
import { useEntities } from '@/shared/hooks/useEntities';
import { toast } from 'react-hot-toast';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type TypeFilter = 'all' | 'sale' | 'income' | 'expense';

interface Transaction {
  id: string;
  type: 'sale' | 'income' | 'expense';
  amount: number;
  payment_method: string;
  description: string;
  created_at: string;
  cashier_name?: string;
  tenant_id?: string;
  status?: string;
  network_source_tenant_id?: string;
  network_link_id?: string;
  network_read_status?: string;
}

export const Transactions = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const addTransactionMutation = useAddFinanceTransaction();
  const deleteTransactionMutation = useDeleteFinanceTransaction();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  
  // Forms
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');

  // Delete Action
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTxDetailOpen, setIsTxDetailOpen] = useState(false);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        query = query.gte('created_at', start.toISOString());
      } else if (dateFilter === 'week') {
        const start = new Date(now.setDate(now.getDate() - 7));
        query = query.gte('created_at', start.toISOString());
      } else if (dateFilter === 'month') {
        const start = new Date(now.setMonth(now.getMonth() - 1));
        query = query.gte('created_at', start.toISOString());
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateFilter, typeFilter]);

  useEffect(() => {
    if (tenantId) fetchTransactions();
  }, [tenantId, fetchTransactions]);

  const handleAddTx = async (type: 'income' | 'expense') => {
    if (!tenantId || !user || !txAmount) return;
    
    try {
      await addTransactionMutation.mutateAsync({
        tenant_id: tenantId,
        user_id: user.id,
        cashier_name: user.name || user.email?.split('@')[0] || 'Patron',
        type: type,
        amount: parseFloat(txAmount),
        description: txDesc || (type === 'income' ? 'Diğer Gelir' : 'Gider/Masraf'),
        payment_method: 'cash',
        customer_id: null
      });
      
      toast.success(type === 'income' ? 'Gelir başarıyla eklendi.' : 'Masraf başarıyla eklendi.');
      if (type === 'income') setIsAddIncomeOpen(false);
      else setIsAddExpenseOpen(false);
      
      setTxAmount('');
      setTxDesc('');
      fetchTransactions();
    } catch (err) {
      toast.error('İşlem eklenirken hata oluştu.');
    }
  };

  const handleDeleteTx = async () => {
    if (!selectedTx || !tenantId) return;
    
    try {
      await deleteTransactionMutation.mutateAsync({
        id: selectedTx.id,
        tenant_id: tenantId
      });
      toast.success('İşlem silindi.');
      setIsTxDetailOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (error) {
      toast.error('İşlem silinemedi.');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.status === 'cancelled' || tx.payment_method === 'cancelled' || tx.description?.startsWith('[İPTAL')) return false;
      if (searchQuery && !(tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) && !(tx.cashier_name || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [transactions, searchQuery]);

  const { data: customers = [] } = useEntities(tenantId);
  const totalAlacak = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    filteredTransactions.forEach(tx => {
      // Veresiye olan girişler fiziksel kasaya girmez
      if (tx.payment_method === 'veresiye' && (tx.type === 'sale' || tx.type === 'income')) {
        // Önceden totalVeresiye'ye ekliyorduk, artık global alacağı kullanıyoruz
      } 
      // Sadece nakit ve kredi kartı olanlar Fiziksel Kasaya girer
      else if (tx.type === 'sale' || tx.type === 'income') {
        totalIncome += Number(tx.amount);
      } 
      else if (tx.type === 'expense') {
        totalExpense += Number(tx.amount);
      }
    });
    
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const result: { title: string, txs: Transaction[] }[] = [];
    filteredTransactions.forEach(tx => {
       const date = new Date(tx.created_at);
       const today = new Date();
       const yesterday = new Date(today);
       yesterday.setDate(yesterday.getDate() - 1);
       
       let title = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
       if (date.toDateString() === today.toDateString()) title = 'Bugün';
       else if (date.toDateString() === yesterday.toDateString()) title = 'Dün';
       
       let group = result.find(g => g.title === title);
       if (!group) {
          group = { title, txs: [] };
          result.push(group);
       }
       if (!group.txs.includes(tx)) {
          group.txs.push(tx);
       }
    });
    return result;
  }, [filteredTransactions]);

  const getTypeIcon = (type: string) => {
    if (type === 'sale') return <ShoppingBag className="h-6 w-6 text-primary" />;
    if (type === 'income') return <ArrowDownRight className="h-6 w-6 text-success" />;
    if (type === 'expense') return <ArrowUpRight className="h-6 w-6 text-danger" />;
    return null;
  };

  const getPaymentMethodLabel = (method: string) => {
    if (method === 'credit_card') return 'Kredi Kartı';
    if (method === 'veresiye') return 'Veresiye';
    return 'Nakit';
  };

  return (
    <div className="flex flex-col h-full w-full gap-4 lg:gap-6 pb-2 overflow-hidden">
      <Header 
        title="Kasa ve Masraflar" 
        subtitle="Tüm nakit giriş ve çıkışları"
      />
      
      <div className="flex flex-col gap-4 lg:gap-6 shrink-0">
          
        {/* Hero Summary Card */}
          <HeroCard>
            <HeroCard.Header 
              title="Net Kasa (Fiziksel)" 
              value={summary.net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
              unit="TL" 
              icon={<Wallet className="w-3.5 h-3.5" />}
              extra={
                totalAlacak > 0 && (
                  <div className="mt-3 bg-system-bg border border-system-border rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-info shadow-sm animate-pulse"></span>
                    <p className="text-caption text-hero-muted font-medium tracking-wide">
                      Piyasada Bekleyen: <span className="font-bold text-hero-text">{totalAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                    </p>
                  </div>
                )
              }
            />
            <HeroCard.Grid>
              <HeroCard.Stat 
                title="Kasa Girişi" 
                value={`+${summary.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} 
                unit="TL" 
                icon={<TrendingUp className="w-3 h-3 text-success" />}
              />
              <HeroCard.Stat 
                title="Kasa Çıkışı" 
                value={`-${summary.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} 
                unit="TL" 
                icon={<TrendingDown className="w-3 h-3 text-danger" />}
                isRight={true}
              />
            </HeroCard.Grid>
          </HeroCard>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Action Buttons */}
            <Button 
              onClick={() => { setTxAmount(''); setTxDesc(''); setIsAddIncomeOpen(true); }}
              variant="secondary"
              size="sm"
              fullWidth
            >
              <ArrowDownRight className="w-4 h-4 mr-1.5 text-success" />
              Gelir Ekle
            </Button>
            <Button 
              onClick={() => { setTxAmount(''); setTxDesc(''); setIsAddExpenseOpen(true); }}
              variant="danger"
              size="sm"
              fullWidth
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" />
              Masraf Ekle
            </Button>

            {/* Search & Filter */}
            <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
              <div className="flex-1">
                <Input 
                  icon={<Search className="w-4 h-4 text-text-tertiary" />}
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                variant={isFilterOpen ? 'primary' : 'secondary'}
                size="icon"
              >
                <Filter className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="p-4 space-y-4 bg-system-surface border border-system-border">
                  <div>
                    <label className="text-micro font-bold text-text-tertiary mb-2 block uppercase tracking-wider">Tarih Aralığı</label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {[
                        { id: 'today', label: 'Bugün' },
                        { id: 'week', label: 'Son 7 Gün' },
                        { id: 'month', label: 'Bu Ay' },
                        { id: 'all', label: 'Tümü' }
                      ].map(f => (
                        <Button
                          key={f.id}
                          size="sm"
                          variant={dateFilter === f.id ? 'primary' : 'secondary'}
                          onClick={() => setDateFilter(f.id as DateFilter)}
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-micro font-bold text-text-tertiary mb-2 block uppercase tracking-wider">İşlem Tipi</label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {[
                        { id: 'all', label: 'Tümü' },
                        { id: 'sale', label: 'Satışlar' },
                        { id: 'income', label: 'Gelirler' },
                        { id: 'expense', label: 'Giderler' }
                      ].map(f => (
                        <Button
                          key={f.id}
                          size="sm"
                          variant={typeFilter === f.id ? 'primary' : 'secondary'}
                          onClick={() => setTypeFilter(f.id as TypeFilter)}
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>
        </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col flex-1 min-h-0 mt-4">
        <DataList>
            {loading ? (
              <div className="flex-1 h-full flex items-center justify-center py-20 text-text-tertiary">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex-1 h-full flex items-center justify-center py-8">
                <EmptyState 
                  icon={Calendar}
                  title={searchQuery ? "Sonuç Bulunamadı" : "İşlem Bulunamadı"}
                  description={searchQuery ? "Aramanıza uygun işlem bulunamadı." : "Seçtiğiniz filtreye uygun kasa hareketi bulunmuyor. Yeni bir masraf veya gelir ekleyerek başlayabilirsiniz."}
                  actionLabel={searchQuery ? undefined : "Masraf Ekle"}
                  actionIcon={Plus}
                  onAction={searchQuery ? undefined : () => setIsAddExpenseOpen(true)}
                />
              </div>
            ) : (
              <div className="divide-y divide-system-border/50">
                {groupedTransactions.map((group) => (
                  <div key={group.title}>
                    <div className="px-4 lg:px-6 py-2 bg-system-surface border-b border-system-border/50 sticky top-0 z-10">
                      <h4 className="text-micro font-bold text-text-secondary uppercase tracking-wider">{group.title}</h4>
                    </div>
                    <div className="divide-y divide-system-border/50">
                      {group.txs.map((tx) => {
                        const isExternal = tx.network_source_tenant_id && tx.network_source_tenant_id !== tenantId;
                        const isMySyncedTx = tx.network_link_id && tx.network_source_tenant_id === tenantId;
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={tx.id}
                            onClick={() => { setSelectedTx(tx); setIsTxDetailOpen(true); }}
                            className={`p-3 lg:p-4 sm:px-6 flex items-center space-x-3 lg:space-x-4 transition-all hover:bg-glass-highlight cursor-pointer group ${isExternal ? 'bg-info-light/40 border-l-4 border-info' : ''}`}
                          >
                            <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary/5 border border-system-border/50 ${tx.type === 'sale' ? 'text-primary' : tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                              {getTypeIcon(tx.type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <div className="flex items-center gap-2 pr-2 min-w-0">
                                  <p className="font-semibold text-body text-text-primary capitalize truncate">
                                    {tx.description || (tx.type === 'sale' ? 'Satış' : tx.type === 'income' ? 'Gelir' : 'Gider')}
                                  </p>
                                  {isExternal && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-info/10 text-info border border-info/20 rounded-md whitespace-nowrap">DIŞ AĞ</span>}
                                </div>
                                <p className={`font-bold text-title-3 flex-shrink-0 ${tx.type === 'expense' ? 'text-text-primary' : 'text-success'}`}>
                                  {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                </p>
                              </div>
                              
                              <div className="flex items-center text-caption font-medium text-text-secondary">
                                <span className="flex-shrink-0">{new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute:'2-digit' })}</span>
                                <span className="mx-2 text-system-border">•</span>
                                <span className="flex-shrink-0">{getPaymentMethodLabel(tx.payment_method)}</span>
                                
                                {tx.cashier_name && (
                                  <>
                                    <span className="mx-2 text-system-border">•</span>
                                    <span className="truncate">
                                      {tx.cashier_name}
                                    </span>
                                  </>
                                )}
                                
                                {isMySyncedTx && (
                                  <>
                                    <span className="mx-2 text-system-border">•</span>
                                    <span className="flex items-center">
                                      {tx.network_read_status === 'sent' && <span title="Gönderildi"><Check className="w-3.5 h-3.5 text-text-tertiary" /></span>}
                                      {tx.network_read_status === 'read' && <span title="Okundu"><CheckCheck className="w-3.5 h-3.5 text-info" /></span>}
                                      {tx.network_read_status === 'disputed' && <span title="İtiraz Edildi"><AlertCircle className="w-3.5 h-3.5 text-danger" /></span>}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataList>
      </div>

      {/* Expense Modal */}
      <BottomSheet isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Gider / Masraf Ekle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-caption font-bold text-text-secondary mb-1">Masraf Tutarı</label>
            <Input type="number" placeholder="Örn: 150" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-caption font-bold text-text-secondary mb-1">Açıklama</label>
            <Input placeholder="Örn: Kurye bahşişi, Elektrik faturası vb." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button 
            className="w-full mt-4"
            variant="danger"
            onClick={() => handleAddTx('expense')} 
            disabled={!txAmount || addTransactionMutation.isPending}
            isLoading={addTransactionMutation.isPending}
          >
            Masrafı Kaydet
          </Button>
        </div>
      </BottomSheet>

      {/* Income Modal */}
      <BottomSheet isOpen={isAddIncomeOpen} onClose={() => setIsAddIncomeOpen(false)} title="Gelir Ekle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-caption font-bold text-text-secondary mb-1">Gelir Tutarı</label>
            <Input type="number" placeholder="Örn: 500" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-caption font-bold text-text-secondary mb-1">Açıklama</label>
            <Input placeholder="Örn: Hurda satışı, Elden ödeme vb." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button 
            className="w-full mt-4"
            onClick={() => handleAddTx('income')} 
            disabled={!txAmount || addTransactionMutation.isPending}
            isLoading={addTransactionMutation.isPending}
          >
            Geliri Kaydet
          </Button>
        </div>
      </BottomSheet>

      {/* Transaction Detail Modal */}
      <BottomSheet isOpen={isTxDetailOpen} onClose={() => setIsTxDetailOpen(false)} title="İşlem Detayı">
        {selectedTx && (
          <div className="space-y-6 pt-2 pb-8">
            <div className="text-center">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${selectedTx.type === 'sale' ? 'bg-primary/10 text-primary' : selectedTx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {getTypeIcon(selectedTx.type)}
              </div>
              <h2 className="text-headline font-black text-text-primary mb-1">
                {selectedTx.type === 'expense' ? '-' : '+'}{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </h2>
              <p className="text-text-secondary font-medium text-body">{selectedTx.description || 'Açıklama yok'}</p>
            </div>

            <div className="bg-system-bg border border-system-border rounded-2xl p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Tarih</span>
                <span className="font-bold text-text-primary">{new Date(selectedTx.created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Ödeme Yöntemi</span>
                <span className="font-bold text-text-primary">{getPaymentMethodLabel(selectedTx.payment_method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">İşlem Tipi</span>
                <span className="font-bold text-text-primary capitalize">{selectedTx.type === 'sale' ? 'Satış' : selectedTx.type === 'income' ? 'Gelir' : 'Gider / Masraf'}</span>
              </div>
              {selectedTx.cashier_name && (
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">İşlemi Yapan</span>
                  <span className="font-bold text-text-primary">{selectedTx.cashier_name}</span>
                </div>
              )}
            </div>

            {selectedTx.type !== 'sale' && (
              <div className="pt-2">
                <Button 
                  variant="danger" 
                  size="lg"
                  fullWidth
                  onClick={() => {
                    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
                      handleDeleteTx();
                    }
                  }}
                  disabled={deleteTransactionMutation.isPending}
                  isLoading={deleteTransactionMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> İşlemi Sil
                </Button>
                <p className="text-xs text-center text-text-tertiary mt-3">Sadece manuel eklenen gelir ve masraflar silinebilir. Satış iptali için iade işlemi gereklidir.</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
