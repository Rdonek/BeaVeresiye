import React, { useState, useMemo } from 'react';
import { Header } from '@/widgets/Header';
import { useTenant } from '@/app/providers/TenantProvider';
import { useFinanceTransactions, useUpdateFinanceTransaction } from '@/shared/hooks/useFinance';
import { useEntities, useUpdateEntityBalance } from '@/shared/hooks/useEntities';
import { GlassCard } from '@/shared/ui/GlassCard';
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
    if (type === 'sale') return <ShoppingBag className="h-5 w-5 text-primary" />;
    if (type === 'income') return <ArrowDownRight className="h-5 w-5 text-success" />;
    if (type === 'expense') return <ArrowUpRight className="h-5 w-5 text-danger" />;
    return <FileText className="h-5 w-5" />;
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
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-20 print:bg-white print:p-0 print:m-0 print:max-w-none">
      <div className="print:hidden">
        <Header title="İşlem Geçmişi" subtitle="Tüm finansal hareketlerin detaylı dökümü" />
      </div>
      
      {/* Print Only Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{tenantName || 'İşletme'}</h1>
        <h2 className="text-lg text-gray-600 mt-1">İşlem Geçmişi Ekstresi</h2>
        <p className="text-sm text-gray-500 mt-2">Oluşturulma Tarihi: {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
        <p className="text-xs text-gray-500 mt-1">Toplam Listelenen İşlem: {filteredTransactions.length}</p>
      </div>

      <div className="flex flex-col gap-3 print:hidden">
        {/* Search & Filter Toggle Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input 
              icon={<Search className="w-5 h-5 text-gray-400" />}
              placeholder="Açıklama, Müşteri veya Kasiyer ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`relative h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all border active:scale-[0.97] ${
              isFilterOpen 
                ? 'bg-primary border-primary text-white shadow-sm' 
                : 'bg-white border-gray-200 text-text-secondary hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtreler</span>
            {isFiltersModified && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-[10px] font-black shadow-sm">
                {activeFilterCount + (search.length > 0 ? 1 : 0)}
              </span>
            )}
          </button>
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
              <GlassCard className="p-0">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                    Filtreler
                    {isFiltersModified && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black">
                        {activeFilterCount + (search.length > 0 ? 1 : 0)} aktif
                      </span>
                    )}
                  </p>
                  <button
                    onClick={resetAllFilters}
                    disabled={!isFiltersModified}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Sıfırla
                  </button>
                </div>

                {/* Filter Groups */}
                <div className="divide-y divide-gray-100">
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
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button variant="outline" onClick={handleExportExcel} className="bg-white text-success border-success/20 hover:bg-success/5 shadow-sm text-xs h-9 px-3 flex-shrink-0">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="bg-white text-danger border-danger/20 hover:bg-danger/5 shadow-sm text-xs h-9 px-3 flex-shrink-0">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" onClick={handlePrint} className="bg-white text-text-secondary border-gray-200 hover:bg-gray-50 shadow-sm text-xs h-9 px-3 flex-shrink-0">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Yazdır
          </Button>
          <span className="text-[11px] text-text-tertiary font-medium ml-auto flex-shrink-0">
            {filteredTransactions.length} işlem listeleniyor
          </span>
        </div>
      </div>

      <GlassCard variant="panel" padding="none" className="print:shadow-none print:border-none print:bg-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 font-medium flex-col print:hidden">
            <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
            İşlemler Yükleniyor...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center print:hidden">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">İşlem Bulunamadı</h3>
            <p className="text-gray-500 mt-1 max-w-sm text-sm">Seçili filtrelere uygun herhangi bir finansal işlem listelenemedi.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 print:divide-gray-200">
            {/* Desktop / Print Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 print:bg-gray-100 border-b border-gray-100 font-bold text-[11px] text-gray-500 uppercase tracking-wider sticky top-0 backdrop-blur-md z-10 print:static print:text-black">
              <div className="col-span-2">Tarih</div>
              <div className="col-span-4">İşlem & Açıklama</div>
              <div className="col-span-2">Ödeme</div>
              <div className="col-span-2">Kasiyer</div>
              <div className="col-span-2 text-right">Tutar</div>
            </div>

            {filteredTransactions.map((tx) => {
              const isCancelled = tx.status === 'cancelled' || tx.payment_method === 'cancelled' || tx.description?.startsWith('[İPTAL');
              return (
              <div 
                key={tx.id} 
                onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                className={`px-6 py-4 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50 cursor-pointer transition-colors print:hover:bg-transparent print:border-b print:border-gray-200 print:py-2 ${isCancelled ? 'opacity-50 line-through grayscale' : ''}`}
              >
                {/* Mobile View */}
                <div className="flex items-center justify-between md:hidden mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    <span className="font-bold text-gray-900 text-[15px]">{getTypeLabel(tx.type)}</span>
                  </div>
                  <span className={`font-black text-lg ${tx.type === 'expense' ? 'text-danger' : 'text-gray-900'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </span>
                </div>
                
                <div className="md:hidden flex flex-col gap-1.5 pl-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-gray-900 font-medium text-sm leading-snug">{tx.description?.replace('[İPTAL EDİLDİ] ', '') || '-'}</p>
                    {isCancelled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-danger/10 text-danger border border-danger/20 print:border-black print:text-black print:bg-transparent">İPTAL EDİLDİ</span>}
                  </div>
                  {tx.customer_id && <p className="text-xs text-primary font-bold">👤 {getCustomerName(tx.customer_id)}</p>}
                  <p className="text-xs text-gray-500 font-semibold">{format(new Date(tx.created_at || ''), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
                  <div className="flex gap-2 text-[11px] font-bold mt-1 uppercase tracking-wider flex-wrap">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{getPaymentMethodLabel(tx.payment_method || '')}</span>
                    <span className="bg-primary/5 text-primary px-2 py-0.5 rounded">{tx.cashier_name || 'Bilinmiyor'}</span>
                  </div>
                </div>

                {/* Desktop / Print View */}
                <div className="hidden md:block md:col-span-2 text-[13px] text-gray-500 font-semibold print:text-black">
                  {format(new Date(tx.created_at || ''), 'dd.MM.yyyy HH:mm')}
                </div>
                <div className="hidden md:flex md:col-span-4 items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center print:hidden ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm truncate print:text-black">{tx.description?.replace('[İPTAL EDİLDİ] ', '') || getTypeLabel(tx.type)}</p>
                      {isCancelled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-danger/10 text-danger border border-danger/20 print:border-black print:text-black print:bg-transparent">İPTAL EDİLDİ</span>}
                    </div>
                    {tx.customer_id && <p className="text-[11px] text-primary font-bold truncate">Müşteri: {getCustomerName(tx.customer_id)}</p>}
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2">
                  <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider print:bg-transparent print:p-0 print:text-black">{getPaymentMethodLabel(tx.payment_method || '')}</span>
                </div>
                <div className="hidden md:block md:col-span-2 text-[13px] font-bold text-gray-700 truncate print:text-black">
                  {tx.cashier_name || 'Bilinmiyor'}
                </div>
                <div className={`hidden md:block md:col-span-2 text-right font-black text-[15px] print:text-black ${tx.type === 'expense' ? 'text-danger' : 'text-gray-900'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </div>
              </div>
            )})}
          </div>
        )}
      </GlassCard>

      {/* Detail Modal */}
      <BottomSheet isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="İşlem Detayları">
        {selectedTx && (
          <div className="pt-2 pb-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-3 ${selectedTx.type === 'sale' ? 'bg-primary/10 text-primary' : selectedTx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {getTypeIcon(selectedTx.type)}
              </div>
              <h2 className={`text-4xl font-black ${selectedTx.type === 'expense' ? 'text-danger' : 'text-gray-900'}`}>
                {selectedTx.type === 'expense' ? '-' : '+'}{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </h2>
              <p className="text-gray-500 font-bold mt-1 uppercase tracking-wider text-xs">{getTypeLabel(selectedTx.type)}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <span className="text-gray-500 font-semibold text-sm">İşlem Tarihi</span>
                <span className="text-gray-900 font-bold text-sm">{format(new Date(selectedTx.created_at), 'dd MMMM yyyy, HH:mm', { locale: tr })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <span className="text-gray-500 font-semibold text-sm">Ödeme Yöntemi</span>
                <span className="text-gray-900 font-bold text-sm">{getPaymentMethodLabel(selectedTx.payment_method)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <span className="text-gray-500 font-semibold text-sm">İşlemi Yapan (Kasiyer)</span>
                <span className="text-gray-900 font-bold text-sm">{selectedTx.cashier_name || '-'}</span>
              </div>
              {selectedTx.customer_id && (
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-semibold text-sm">Müşteri (Cari)</span>
                  <span className="text-primary font-bold text-sm">{getCustomerName(selectedTx.customer_id)}</span>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-gray-500 font-semibold text-sm">Açıklama / İçerik</span>
                <span className="text-gray-900 font-bold text-sm bg-white p-4 rounded-xl border border-gray-200 min-h-[60px] whitespace-pre-wrap">
                  {selectedTx.description || '-'}
                </span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-red-700 font-black text-sm flex items-center gap-2 uppercase tracking-wide">
                <Trash2 className="w-4 h-4" /> Kritik İşlem
              </h4>
              <p className="text-xs text-red-600 font-semibold leading-relaxed">
                Bu işlemi silmek kasanızdaki fiziksel nakit miktarını veya müşteri bakiyesini kalıcı olarak etkiler. Yapılan işlemler geri alınamaz, tüm sorumluluk size aittir.
              </p>
              <Button variant="danger" className="mt-1 w-full h-11" onClick={handleDelete} isLoading={updateMutation.isPending}>
                Sorumluluğu Kabul Ediyorum, İptal Et
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
