import React, { useState, useMemo } from 'react';
import { Header } from '@/widgets/Header';
import { useTenant } from '@/app/providers/TenantProvider';
import { useFinanceTransactions, useDeleteFinanceTransaction } from '@/shared/hooks/useFinance';
import { useEntities } from '@/shared/hooks/useEntities';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Search, Filter, Download, FileText, Printer, ArrowDownRight, ArrowUpRight, ShoppingBag, Calendar, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const History = () => {
  const { tenantId, tenantName } = useTenant();
  const { data: transactions = [], isLoading } = useFinanceTransactions(tenantId);
  const { data: customers = [] } = useEntities(tenantId);

  const deleteMutation = useDeleteFinanceTransaction();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'sale'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'credit_card' | 'veresiye'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getCustomerName = (id: string | null) => {
    if (!id) return '';
    const customer = customers.find(c => c.id === id);
    return customer ? customer.name : '';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Date Filter
      if (startDate && new Date(tx.created_at) < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(tx.created_at) > end) return false;
      }
      
      // Type Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      
      // Payment Filter
      if (paymentFilter !== 'all' && tx.payment_method !== paymentFilter) return false;

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
  }, [transactions, startDate, endDate, typeFilter, paymentFilter, search, customers]);

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
    'Tarih': format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm'),
    'İşlem Tipi': getTypeLabel(tx.type),
    'Açıklama': tx.description || '-',
    'Müşteri': getCustomerName(tx.customer_id) || '-',
    'Ödeme Yöntemi': getPaymentMethodLabel(tx.payment_method),
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

  const handleExportPDF = () => {
    if (exportData.length === 0) {
      toast.error('Dışa aktarılacak veri bulunamadı.');
      return;
    }
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.text(`${tenantName || 'İşletme'} - İşlem Geçmişi Raporu`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Tarih: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 40, 55);
    
    const headers = [['Tarih', 'İşlem Tipi', 'Açıklama', 'Müşteri', 'Ödeme Yöntemi', 'Kasiyer', 'Tutar (TL)']];
    const data = exportData.map(row => Object.values(row));

    (doc as any).autoTable({
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
    if (window.confirm('DİKKAT: Bu işlemi silmek hesapları kalıcı olarak etkileyebilir ve bu işlem geri alınamaz! Sorumluluk tamamen size aittir. Silmek istediğinize emin misiniz?')) {
      try {
        await deleteMutation.mutateAsync({ id: selectedTx.id, tenant_id: tenantId });
        toast.success('İşlem başarıyla silindi.');
        setIsDetailOpen(false);
        setSelectedTx(null);
      } catch (err) {
        toast.error('Silme sırasında hata oluştu.');
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

      <div className="flex flex-col gap-4 print:hidden">
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1">
            <Input 
              icon={<Search className="w-5 h-5 text-gray-400" />}
              placeholder="Açıklama, Müşteri veya Kasiyer ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-[42px] px-4 flex items-center justify-center rounded-xl transition-all border shadow-sm ${isFilterOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="h-5 w-5 mr-2" />
            <span className="font-bold">Filtreler</span>
          </Button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <GlassCard className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block tracking-wider">Başlangıç Tarihi</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block tracking-wider">Bitiş Tarihi</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block tracking-wider">İşlem Tipi</label>
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full h-[42px] px-3 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-semibold text-gray-700 transition-all shadow-sm"
                  >
                    <option value="all">Tüm İşlemler</option>
                    <option value="sale">Satışlar</option>
                    <option value="income">Tahsilat / Gelir</option>
                    <option value="expense">Masraf / Gider</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block tracking-wider">Ödeme Yöntemi</label>
                  <select 
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="w-full h-[42px] px-3 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-semibold text-gray-700 transition-all shadow-sm"
                  >
                    <option value="all">Tüm Yöntemler</option>
                    <option value="cash">Nakit</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="veresiye">Veresiye</option>
                  </select>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="bg-white text-green-700 border-green-200 hover:bg-green-50 shadow-sm flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> Excel'e Aktar
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="bg-white text-red-700 border-red-200 hover:bg-red-50 shadow-sm flex-1 sm:flex-none">
            <FileText className="w-4 h-4 mr-2" /> PDF İndir
          </Button>
          <Button variant="outline" onClick={handlePrint} className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm flex-1 sm:flex-none">
            <Printer className="w-4 h-4 mr-2" /> Sayfayı Yazdır
          </Button>
        </div>
      </div>

      <GlassCard variant="panel" padding="none" className="print:shadow-none print:border-none print:bg-transparent mt-2">
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

            {filteredTransactions.map((tx) => (
              <div 
                key={tx.id} 
                onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                className="px-6 py-4 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50 cursor-pointer transition-colors print:hover:bg-transparent print:border-b print:border-gray-200 print:py-2"
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
                  <p className="text-gray-900 font-medium text-sm leading-snug">{tx.description || '-'}</p>
                  {tx.customer_id && <p className="text-xs text-primary font-bold">👤 {getCustomerName(tx.customer_id)}</p>}
                  <p className="text-xs text-gray-500 font-semibold">{format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
                  <div className="flex gap-2 text-[11px] font-bold mt-1 uppercase tracking-wider flex-wrap">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{getPaymentMethodLabel(tx.payment_method)}</span>
                    <span className="bg-primary/5 text-primary px-2 py-0.5 rounded">{tx.cashier_name || 'Bilinmiyor'}</span>
                  </div>
                </div>

                {/* Desktop / Print View */}
                <div className="hidden md:block md:col-span-2 text-[13px] text-gray-500 font-semibold print:text-black">
                  {format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm')}
                </div>
                <div className="hidden md:flex md:col-span-4 items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center print:hidden ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate print:text-black">{tx.description || getTypeLabel(tx.type)}</p>
                    {tx.customer_id && <p className="text-[11px] text-primary font-bold truncate">Müşteri: {getCustomerName(tx.customer_id)}</p>}
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2">
                  <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider print:bg-transparent print:p-0 print:text-black">{getPaymentMethodLabel(tx.payment_method)}</span>
                </div>
                <div className="hidden md:block md:col-span-2 text-[13px] font-bold text-gray-700 truncate print:text-black">
                  {tx.cashier_name || 'Bilinmiyor'}
                </div>
                <div className={`hidden md:block md:col-span-2 text-right font-black text-[15px] print:text-black ${tx.type === 'expense' ? 'text-danger' : 'text-gray-900'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </div>
              </div>
            ))}
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
              <Button variant="danger" className="mt-1 w-full h-11" onClick={handleDelete} isLoading={deleteMutation.isPending}>
                Sorumluluğu Kabul Ediyorum, Sil
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
