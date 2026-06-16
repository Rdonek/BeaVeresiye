import React, { useState, useMemo } from 'react';
import { Header } from '@/widgets/Header';
import { useTenant } from '@/app/providers/TenantProvider';
import { useFinanceTransactions, useUpdateFinanceTransaction } from '@/shared/hooks/useFinance';
import { useEntities, useUpdateEntityBalance } from '@/shared/hooks/useEntities';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GlassCard as Card, GlassCard } from '@/shared/ui/GlassCard';
import { DataList } from '@/shared/ui/DataList';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { FilterChip } from '@/shared/ui/FilterChip';
import { Search, Filter, Download, FileText, Printer, ArrowDownRight, ArrowUpRight, ShoppingBag, Calendar, Loader2, Trash2, CreditCard, Wallet, RotateCcw, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Filter Configuration ──────────────────────────────────────────────
interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
  defaults: string[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: 'type',
    label: 'İşlem Tipi',
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
    options: [
      { value: 'sale', label: 'Satışlar', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
      { value: 'income', label: 'Tahsilat / Gelir', icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
      { value: 'expense', label: 'Masraf / Gider', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    ],
    defaults: ['sale', 'income', 'expense'],
  },
  {
    key: 'payment',
    label: 'Ödeme Yöntemi',
    icon: <CreditCard className="w-3.5 h-3.5" />,
    options: [
      { value: 'cash', label: 'Nakit', icon: <Banknote className="w-3.5 h-3.5" /> },
      { value: 'credit_card', label: 'Kredi Kartı', icon: <CreditCard className="w-3.5 h-3.5" /> },
      { value: 'veresiye', label: 'Veresiye', icon: <Wallet className="w-3.5 h-3.5" /> },
    ],
    defaults: ['cash', 'credit_card', 'veresiye'],
  },
  {
    key: 'status',
    label: 'Durum',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    options: [
      { value: 'active', label: 'Aktif İşlemler', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
      { value: 'cancelled', label: 'İptal Edilenler', icon: <XCircle className="w-3.5 h-3.5" /> },
    ],
    defaults: ['active'],
  },
];

// ── Component ─────────────────────────────────────────────────────────
export const History = () => {
  const { tenantId, tenantName } = useTenant();
  const { data: transactions = [], isLoading } = useFinanceTransactions(tenantId);
  const { data: customers = [] } = useEntities(tenantId);

  const updateMutation = useUpdateFinanceTransaction();
  const updateBalanceMutation = useUpdateEntityBalance();

  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<string[]>(FILTER_GROUPS[0].defaults);
  const [paymentFilters, setPaymentFilters] = useState<string[]>(FILTER_GROUPS[1].defaults);
  const [statusFilters, setStatusFilters] = useState<string[]>(FILTER_GROUPS[2].defaults);

  const filterStateMap: Record<string, { state: string[]; setter: React.Dispatch<React.SetStateAction<string[]>> }> = {
    type: { state: typeFilters, setter: setTypeFilters },
    payment: { state: paymentFilters, setter: setPaymentFilters },
    status: { state: statusFilters, setter: setStatusFilters },
  };

  const toggleFilter = (key: string, val: string) => {
    const { state, setter } = filterStateMap[key];
    setter(state.includes(val) ? state.filter(p => p !== val) : [...state, val]);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ── Derived: Active filter count ──
  const activeFilterCount = useMemo(() => {
    let count = 0;
    FILTER_GROUPS.forEach(group => {
      const { state } = filterStateMap[group.key];
      const diff = group.defaults.length !== state.length ||
        !group.defaults.every(d => state.includes(d));
      if (diff) count++;
    });
    return count;
  }, [typeFilters, paymentFilters, statusFilters]);

  const isFiltersModified = activeFilterCount > 0 || search.length > 0;

  const resetAllFilters = () => {
    FILTER_GROUPS.forEach(group => {
      filterStateMap[group.key].setter(group.defaults);
    });
    setSearch('');
  };

  const getCustomerName = (id: string | null) => {
    if (!id) return '';
    const customer = customers.find(c => c.id === id);
    return customer ? customer.name : '';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Status Filter
      const isTxCancelled = tx.status === 'cancelled' || tx.payment_method === 'cancelled' || tx.description?.startsWith('[İPTAL');
      const txStatus = isTxCancelled ? 'cancelled' : 'active';
      if (!statusFilters.includes(txStatus)) return false;

      // Type Filter
      if (!typeFilters.includes(tx.type)) return false;
      
      // Payment Filter
      if (!isTxCancelled && !paymentFilters.includes(tx.payment_method || '')) return false;

      // Search Filter
      if (search) {
        const term = search.toLowerCase();
        const descMatch = tx.description?.toLowerCase().includes(term);
        const cashierMatch = tx.cashier_name?.toLowerCase().includes(term);
        const customerMatch = getCustomerName(tx.customer_id).toLowerCase().includes(term);
        if (!descMatch && !cashierMatch && !customerMatch) return false;
      }

      return true;
    });
  }, [transactions, typeFilters, paymentFilters, statusFilters, search, customers]);

  const getTypeIcon = (type: string) => {
    if (type === 'sale') return <ShoppingBag className="h-6 w-6 text-primary" />;
    if (type === 'income') return <ArrowDownRight className="h-6 w-6 text-success" />;
    if (type === 'expense') return <ArrowUpRight className="h-6 w-6 text-danger" />;
    return <FileText className="h-6 w-6" />;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'sale') return 'Satış';
    if (type === 'income') return 'Gelir/Tahsilat';
    if (type === 'expense') return 'Gider/Masraf';
    return 'İşlem';
  };

  const getPaymentMethodLabel = (method: string) => {
    if (method === 'credit_card') return 'Kredi Kartı';
    if (method === 'veresiye') return 'Veresiye (Açık Hesap)';
    return 'Nakit';
  };

  const exportData = filteredTransactions.map(tx => ({
    'Tarih': format(new Date(tx.created_at || ''), 'dd.MM.yyyy HH:mm'),
    'İşlem Tipi': getTypeLabel(tx.type),
    'Açıklama': tx.description || '-',
    'Müşteri': getCustomerName(tx.customer_id) || '-',
    'Ödeme Yöntemi': getPaymentMethodLabel(tx.payment_method || ''),
    'Kasiyer': tx.cashier_name || 'Bilinmiyor',
    'Tutar (TL)': Number(tx.amount).toFixed(2),
  }));

  const handleExportExcel = () => {
    if (exportData.length === 0) {
      toast.error('Dışa aktarılacak veri bulunamadı.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // Tarih
      { wch: 15 }, // İşlem Tipi
      { wch: 40 }, // Açıklama
      { wch: 20 }, // Müşteri
      { wch: 20 }, // Ödeme Yöntemi
      { wch: 15 }, // Kasiyer
      { wch: 15 }  // Tutar
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Islem Gecmisi");
    XLSX.writeFile(wb, `islem_gecmisi_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success('Excel dosyası indirildi.');
  };

  const replaceTurkishChars = (text: string) => {
    if (!text) return '';
    return String(text)
      .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'U').replace(/ü/g, 'u')
      .replace(/Ş/g, 'S').replace(/ş/g, 's')
      .replace(/İ/g, 'I').replace(/ı/g, 'i')
      .replace(/Ö/g, 'O').replace(/ö/g, 'o')
      .replace(/Ç/g, 'C').replace(/ç/g, 'c');
  };

  const handleExportPDF = () => {
    if (exportData.length === 0) {
      toast.error('Dışa aktarılacak veri bulunamadı.');
      return;
    }
    const doc = new jsPDF('l', 'pt', 'a4');
    
    const safeTenantName = replaceTurkishChars(tenantName || 'Isletme');
    doc.text(`${safeTenantName} - Islem Gecmisi Raporu`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Tarih: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 40, 55);
    
    const headers = [['Tarih', 'Islem Tipi', 'Aciklama', 'Musteri', 'Odeme Yontemi', 'Kasiyer', 'Tutar (TL)']];
    const data = exportData.map(row => Object.values(row).map(val => replaceTurkishChars(String(val))));

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 70,
      styles: { fontSize: 9, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        6: { halign: 'right' }
      }
    });

    doc.save(`islem_gecmisi_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
    toast.success('PDF dosyası indirildi.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!selectedTx || !tenantId) return;
    if (window.confirm('DİKKAT: Bu işlemi iptal etmek hesapları kalıcı olarak etkileyebilir. İptal edilen işlemler listede üstü çizik olarak kalır ancak bakiyeler geri alınır. İptal etmek istediğinize emin misiniz?')) {
      try {
        if (selectedTx.customer_id) {
          const customer = customers.find(c => c.id === selectedTx.customer_id);
          if (customer) {
            const isDebt = selectedTx.payment_method === 'veresiye' || selectedTx.description?.includes('Borç') || selectedTx.description?.includes('Açılış') || selectedTx.type === 'sale';
            const reverseBalanceChange = isDebt ? -selectedTx.amount : selectedTx.amount;
            const newBalance = (customer.balance || 0) + reverseBalanceChange;
            
            await updateBalanceMutation.mutateAsync({
              id: customer.id,
              newBalance,
              tenantId
            });
          }
        }

        await updateMutation.mutateAsync({ 
          id: selectedTx.id, 
          tenant_id: tenantId,
          status: 'cancelled',
        });

        toast.success('İşlem başarıyla iptal edildi ve bakiyeler güncellendi.');
        setIsDetailOpen(false);
        setSelectedTx(null);
      } catch (err) {
        toast.error('İptal sırasında hata oluştu.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-4 pb-2 print:bg-system-surface print:p-0 print:m-0 print:max-w-none">
      <div className="shrink-0 flex flex-col gap-4 print:hidden">
        <Header title="İşlem Geçmişi" subtitle="Tüm finansal hareketlerin detaylı dökümü" />
      </div>
      
      {/* Print Only Header */}
      <div className="hidden print:block mb-6 border-b pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-text-primary">{tenantName || 'İşletme'}</h1>
        <h2 className="text-lg text-text-secondary mt-1">İşlem Geçmişi Ekstresi</h2>
        <p className="text-sm text-text-secondary mt-2">Oluşturulma Tarihi: {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
        <p className="text-xs text-text-secondary mt-1">Toplam Listelenen İşlem: {filteredTransactions.length}</p>
      </div>

      <div className="flex flex-col gap-3 print:hidden shrink-0 w-full min-w-0">
        {/* Search & Filter Toggle Row */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="flex-1 min-w-0">
              <Input 
                icon={<Search className="w-4 h-4 text-text-tertiary" />}
                placeholder="Açıklama, Müşteri veya Kasiyer ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
          </div>
          <Button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            variant={isFilterOpen ? 'primary' : 'secondary'}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filtreler
            {isFiltersModified && (
              <span className="flex items-center justify-center px-1.5 h-5 rounded-full bg-danger text-white text-[10px] font-black shadow-sm ml-2">
                {activeFilterCount + (search.length > 0 ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-system-surface border border-system-border rounded-2xl shadow-sm overflow-hidden">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-system-border">
                  <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider">
                    Filtreler
                    {isFiltersModified && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black">
                        {activeFilterCount + (search.length > 0 ? 1 : 0)} aktif
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={resetAllFilters}
                    disabled={!isFiltersModified}
                    variant="ghost"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Sıfırla
                  </Button>
                </div>

                {/* Filter Groups */}
                <div className="divide-y divide-system-border">
                  {FILTER_GROUPS.map((group) => {
                    const { state } = filterStateMap[group.key];
                    return (
                      <div key={group.key} className="px-5 py-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="text-text-tertiary">{group.icon}</span>
                          <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{group.label}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((opt) => (
                            <FilterChip
                              key={opt.value}
                              label={opt.label}
                              icon={opt.icon}
                              isActive={state.includes(opt.value)}
                              onClick={() => toggleFilter(group.key, opt.value)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-1.5 text-success" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-1.5 text-danger" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5 text-text-secondary" /> Yazdır
            </Button>
          </div>
          <span className="text-caption text-text-tertiary font-bold whitespace-nowrap">
            {filteredTransactions.length} işlem listeleniyor
          </span>
        </div>
      </div>

      <DataList
        className="print:shadow-none print:border-none print:bg-transparent print:overflow-visible"
        header={
          <div className="hidden md:grid grid-cols-12 gap-4 font-bold text-micro text-text-secondary uppercase tracking-wider print:static print:text-black w-full">
            <div className="col-span-2">Tarih</div>
            <div className="col-span-4">İşlem & Açıklama</div>
            <div className="col-span-2">Ödeme</div>
            <div className="col-span-2">Kasiyer</div>
            <div className="col-span-2 text-right">Tutar</div>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary font-medium flex-col print:hidden">
            <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
            İşlemler Yükleniyor...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 print:hidden">
            <EmptyState 
              icon={Calendar}
              title="İşlem Bulunamadı"
              description="Seçili filtrelere uygun herhangi bir finansal işlem listelenemedi."
            />
          </div>
        ) : (
          <div className="divide-y divide-system-border print:divide-system-border/50">

            {filteredTransactions.map((tx) => {
              const isCancelled = tx.status === 'cancelled' || tx.payment_method === 'cancelled' || tx.description?.startsWith('[İPTAL');
              return (
              <div 
                key={tx.id} 
                onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                className={`p-4 sm:px-6 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-glass-highlight cursor-pointer transition-colors print:hover:bg-transparent print:border-b print:border-system-border print:py-2 ${isCancelled ? 'opacity-50 line-through grayscale' : ''}`}
              >
                {/* Mobile View */}
                <div className="flex items-center justify-between md:hidden mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    <span className="font-bold text-text-primary text-body">{getTypeLabel(tx.type)}</span>
                  </div>
                  <span className={`font-black text-title-3 ${tx.type === 'expense' ? 'text-danger' : 'text-text-primary'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </span>
                </div>
                
                <div className="md:hidden flex flex-col gap-1.5 pl-15">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-text-primary font-bold text-body leading-snug">{tx.description?.replace('[İPTAL EDİLDİ] ', '') || '-'}</p>
                    {isCancelled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-micro font-black bg-danger/10 text-danger border border-danger/20 print:border-black print:text-black print:bg-transparent">İPTAL EDİLDİ</span>}
                  </div>
                  {tx.customer_id && <p className="text-caption text-primary font-bold">👤 {getCustomerName(tx.customer_id)}</p>}
                  <p className="text-caption text-text-secondary font-semibold">{format(new Date(tx.created_at || ''), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
                  <div className="flex gap-2 text-micro font-bold mt-1 uppercase tracking-wider flex-wrap">
                    <span className="bg-system-bg px-2 py-0.5 rounded text-text-secondary">{getPaymentMethodLabel(tx.payment_method || '')}</span>
                    <span className="bg-primary/5 text-primary px-2 py-0.5 rounded">{tx.cashier_name || 'Bilinmiyor'}</span>
                  </div>
                </div>

                {/* Desktop / Print View */}
                <div className="hidden md:block md:col-span-2 text-caption text-text-secondary font-semibold print:text-black">
                  {format(new Date(tx.created_at || ''), 'dd.MM.yyyy HH:mm')}
                </div>
                <div className="hidden md:flex md:col-span-4 items-center gap-3 min-w-0">
                  <div className={`h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center print:hidden ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold text-text-primary text-body truncate print:text-black">{tx.description?.replace('[İPTAL EDİLDİ] ', '') || getTypeLabel(tx.type)}</p>
                      {isCancelled && <span className="inline-flex flex-shrink-0 items-center px-1.5 py-0.5 rounded text-micro font-black bg-danger/10 text-danger border border-danger/20 print:border-black print:text-black print:bg-transparent">İPTAL EDİLDİ</span>}
                    </div>
                    {tx.customer_id && <p className="text-micro text-primary font-bold truncate">Müşteri: {getCustomerName(tx.customer_id)}</p>}
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2">
                  <span className="text-micro font-bold bg-system-bg text-text-secondary px-2 py-1 rounded-md uppercase tracking-wider print:bg-transparent print:p-0 print:text-black">{getPaymentMethodLabel(tx.payment_method || '')}</span>
                </div>
                <div className="hidden md:block md:col-span-2 text-caption font-bold text-text-tertiary truncate print:text-black">
                  {tx.cashier_name || 'Bilinmiyor'}
                </div>
                <div className={`hidden md:block md:col-span-2 text-right font-black text-title-3 print:text-black ${tx.type === 'expense' ? 'text-danger' : 'text-text-primary'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </div>
              </div>
            )})}
          </div>
        )}
      </DataList>

      {/* Detail Modal */}
      <BottomSheet isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="İşlem Detayları">
        {selectedTx && (
          <div className="pt-2 pb-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-3 ${selectedTx.type === 'sale' ? 'bg-primary/10 text-primary' : selectedTx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {getTypeIcon(selectedTx.type)}
              </div>
              <h2 className={`text-title-1 font-black tracking-tight ${selectedTx.type === 'expense' ? 'text-danger' : 'text-text-primary'}`}>
                {selectedTx.type === 'expense' ? '-' : '+'}{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </h2>
              <p className="text-text-secondary font-bold mt-1 uppercase tracking-wider text-caption">{getTypeLabel(selectedTx.type)}</p>
            </div>

            <div className="bg-system-bg rounded-2xl p-4 space-y-3 border border-system-border">
              <div className="flex justify-between items-center border-b border-system-border pb-3">
                <span className="text-text-secondary font-semibold text-sm">İşlem Tarihi</span>
                <span className="text-text-primary font-bold text-sm">{format(new Date(selectedTx.created_at), 'dd MMMM yyyy, HH:mm', { locale: tr })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-system-border pb-3">
                <span className="text-text-secondary font-semibold text-sm">Ödeme Yöntemi</span>
                <span className="text-text-primary font-bold text-sm">{getPaymentMethodLabel(selectedTx.payment_method)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-system-border pb-3">
                <span className="text-text-secondary font-semibold text-sm">İşlemi Yapan (Kasiyer)</span>
                <span className="text-text-primary font-bold text-sm">{selectedTx.cashier_name || '-'}</span>
              </div>
              {selectedTx.customer_id && (
                <div className="flex justify-between items-center border-b border-system-border pb-3">
                  <span className="text-text-secondary font-semibold text-sm">Müşteri (Cari)</span>
                  <span className="text-primary font-bold text-sm">{getCustomerName(selectedTx.customer_id)}</span>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-text-secondary font-semibold text-sm">Açıklama / İçerik</span>
                <span className="text-text-primary font-bold text-sm bg-system-surface p-4 rounded-xl border border-system-border min-h-[60px] whitespace-pre-wrap">
                  {selectedTx.description || '-'}
                </span>
              </div>
            </div>

            <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 lg:p-5 flex flex-col gap-3">
              <h4 className="text-danger font-black text-sm flex items-center gap-2 uppercase tracking-wide">
                <Trash2 className="w-4 h-4" /> Kritik İşlem
              </h4>
              <p className="text-caption text-danger font-semibold leading-relaxed">
                Bu işlemi silmek kasanızdaki fiziksel nakit miktarını veya müşteri bakiyesini kalıcı olarak etkiler. Yapılan işlemler geri alınamaz, tüm sorumluluk size aittir.
              </p>
              <Button variant="danger" size="lg" fullWidth onClick={handleDelete} isLoading={updateMutation.isPending}>
                Sorumluluğu Kabul Ediyorum, İptal Et
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
