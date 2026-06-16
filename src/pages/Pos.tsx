import React, { useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { useInventory } from '@/shared/hooks/useInventory';
import { useEntities, useAddEntity } from '@/shared/hooks/useEntities';
import { Header } from '@/widgets/Header';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { ShoppingCart, Plus, ArrowDownRight, ArrowUpRight, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export const Pos = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: loadingProducts } = useInventory(tenantId);
  const { data: customers = [] } = useEntities(tenantId);
  const addCustomerMutation = useAddEntity();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<Array<{ product_id: string, name: string, quantity: number, unit_price: number, total: number, max_stock: number | null }>>([]);
  
  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'veresiye'>('cash');
  const [customerId, setCustomerId] = useState('');
  
  // Quick Customer Add
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Simple Income/Expense Modal
  const [isSimpleTxOpen, setIsSimpleTxOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');

  const grandTotal = lines.reduce((sum, line) => sum + line.total, 0);

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()));

  const handleAddProduct = (prod: any) => {
    if (prod.stock_quantity !== null && prod.stock_quantity <= 0) {
      toast.error(`Uyarı: ${prod.name} stokta kalmamış!`);
      return;
    }

    setLines(currentLines => {
      const existing = currentLines.find(l => l.product_id === prod.id);
      if (existing) {
        if (prod.stock_quantity !== null && existing.quantity >= prod.stock_quantity) {
          toast.error(`Uyarı: Stokta sadece ${prod.stock_quantity} adet var!`);
          return currentLines;
        }
        return currentLines.map(l => 
          l.product_id === prod.id 
            ? { ...l, quantity: l.quantity + 1, total: (l.quantity + 1) * l.unit_price }
            : l
        );
      }
      return [...currentLines, {
        product_id: prod.id,
        name: prod.name,
        quantity: 1,
        unit_price: prod.price || 0,
        total: prod.price || 0,
        max_stock: prod.stock_quantity
      }];
    });
  };

  const handleUpdateLineQuantity = (productId: string, delta: number) => {
    setLines(currentLines => currentLines.map(l => {
      if (l.product_id === productId) {
        const newQty = l.quantity + delta;
        if (newQty <= 0) return { ...l, quantity: 0, total: 0 }; // Will be filtered out
        if (l.max_stock !== null && newQty > l.max_stock) {
          toast.error(`Stok yetersiz!`);
          return l;
        }
        return { ...l, quantity: newQty, total: newQty * l.unit_price };
      }
      return l;
    }).filter(l => l.quantity > 0));
  };

  const handleRemoveLine = (productId: string) => {
    setLines(currentLines => currentLines.filter(l => l.product_id !== productId));
  };

  const handleCreateCustomer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCustomerName || !tenantId) return;
    
    try {
      const newCustomer = await addCustomerMutation.mutateAsync({
        tenant_id: tenantId,
        name: newCustomerName,
        phone: newCustomerPhone || null,
        balance: 0,
      });
      
      setCustomerId(newCustomer.id);
      setIsAddingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('Müşteri eklendi ve seçildi.');
    } catch {
      toast.error('Müşteri eklenirken hata oluştu');
    }
  };

  const handleCheckout = async () => {
    if (!tenantId || !user || lines.length === 0) return;
    if (paymentMethod === 'veresiye' && !customerId) {
      toast.error('Veresiye satış için müşteri (cari) seçmelisiniz.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.rpc('process_pos_sale', {
        p_tenant_id: tenantId,
        p_user_id: user.id,
        p_customer_id: customerId || null,
        p_payment_method: paymentMethod,
        p_grand_total: grandTotal,
        p_cashier_name: user?.type === 'employee' ? user?.name : 'Patron',
        p_lines: lines.map(line => ({
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total,
          name: line.name
        }))
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', tenantId] });
      if (customerId) queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });

      toast.success('Satış tamamlandı!');
      setLines([]);
      setIsCheckoutOpen(false);
      setCustomerId('');
      setPaymentMethod('cash');
      
      // Opt: Open print window if desired here, but keeping it simple for POS
    } catch (error: unknown) {
      toast.error('Satış işlemi tamamlanamadı: ' + (error as Error).message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSimpleTx = async () => {
    if (!tenantId || !user || !txAmount || isNaN(Number(txAmount))) return;
    
    try {
      await supabase.from('transactions').insert({
        tenant_id: tenantId,
        user_id: user.id,
        type: txType,
        amount: parseFloat(txAmount),
        description: txDesc || (txType === 'income' ? 'Diğer Gelir' : 'Gider/Masraf'),
        payment_method: 'cash',
        cashier_name: user?.type === 'employee' ? user?.name : 'Patron'
      });

      toast.success('İşlem kaydedildi!');
      setIsSimpleTxOpen(false);
      setTxAmount('');
      setTxDesc('');
    } catch {
      toast.error('İşlem kaydedilemedi.');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full min-h-0">
      <Header title="Hızlı Satış (POS)" subtitle="Ürün seç, sepete ekle, satışı tamamla." />
      <div className="flex justify-end gap-2 -mt-4 mb-2">
        <Button variant="outline" onClick={() => { setTxType('income'); setIsSimpleTxOpen(true); }} className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 flex-shrink-0">
          <ArrowDownRight className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Gelir Ekle</span>
        </Button>
        <Button variant="outline" onClick={() => { setTxType('expense'); setIsSimpleTxOpen(true); }} className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 flex-shrink-0">
          <ArrowUpRight className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Masraf/Gider</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start min-h-0">
        
        {/* Sol Taraf: Ürünler Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Ürün Ara (Barkod veya İsim)..." 
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[15px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all" 
              />
            </div>
          </div>
          
          <div className="p-4 bg-gray-50/30">
            {loadingProducts ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-medium">Ürün bulunamadı.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleAddProduct(p)}
                    className="bg-white border border-gray-200 rounded-2xl p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] shadow-sm hover:shadow transition-all active:scale-95 group flex items-center gap-3 relative overflow-hidden"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-[15px] sm:text-base text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors" title={p.name}>
                        {p.name}
                      </h3>
                      <p className="text-[11px] font-medium text-gray-400 truncate mb-1.5">
                        {(p as any).category || 'Kategorisiz'}
                      </p>
                      
                      <div className="flex items-center">
                        <span className="font-extrabold text-base sm:text-lg text-primary">{Number(p.price || 0).toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>

                    {/* Stock Badge Corner */}
                    <div className={`absolute top-0 right-0 rounded-bl-xl rounded-tr-2xl px-2 py-0.5 text-[10px] font-bold border-b border-l ${p.stock_quantity === null ? 'bg-blue-50 border-blue-100 text-blue-600' : (p.stock_quantity > 0 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600')}`}>
                      {p.stock_quantity === null ? 'Sınırsız' : `Stok: ${p.stock_quantity}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Sepet */}
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)]">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-t-2xl shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Satış Sepeti</h2>
              <p className="text-xs text-gray-500 font-medium">{lines.length} Çeşit Ürün</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="font-medium">Sepetiniz boş</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.product_id} className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-[15px] text-gray-900 leading-tight">{line.name}</span>
                      <button onClick={() => handleRemoveLine(line.product_id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <button onClick={() => handleUpdateLineQuantity(line.product_id, -1)} className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-95 text-gray-700 font-bold transition-all">-</button>
                        <span className="font-bold text-[15px] w-6 text-center text-gray-900">{line.quantity}</span>
                        <button onClick={() => handleUpdateLineQuantity(line.product_id, 1)} className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-95 text-gray-700 font-bold transition-all">+</button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">{Number(line.unit_price).toLocaleString('tr-TR')} ₺ / br</div>
                        <div className="font-bold text-lg text-primary">{Number(line.total).toLocaleString('tr-TR')} ₺</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl mt-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">Genel Toplam</span>
              <span className="font-extrabold text-3xl text-gray-900 tracking-tight">{grandTotal.toLocaleString('tr-TR')} <span className="text-2xl text-gray-500">₺</span></span>
            </div>
            <Button 
              size="lg" 
              className="w-full h-16 text-xl shadow-xl shadow-primary/25" 
              disabled={lines.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              ÖDEME AL
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <BottomSheet isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Ödeme Al">
        <div className="space-y-6 pt-4 pb-8">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">Tahsil Edilecek Tutar</p>
            <p className="text-4xl font-extrabold text-gray-900">{grandTotal.toLocaleString('tr-TR')} ₺</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Ödeme Yöntemi</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                Nakit
              </button>
              <button
                onClick={() => setPaymentMethod('credit_card')}
                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                Kredi Kartı
              </button>
              <button
                onClick={() => setPaymentMethod('veresiye')}
                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentMethod === 'veresiye' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                Veresiye
              </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ${paymentMethod === 'veresiye' ? 'opacity-100 block' : 'opacity-60 block'}`}>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-gray-700">Müşteri Seçimi {paymentMethod === 'veresiye' && <span className="text-red-500">*</span>}</label>
              {!isAddingCustomer && (
                <button 
                  onClick={() => setIsAddingCustomer(true)} 
                  className="text-xs font-bold text-primary hover:underline flex items-center"
                >
                  <Plus className="w-3 h-3 mr-0.5" /> Yeni Ekle
                </button>
              )}
            </div>

            {isAddingCustomer ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Hızlı Müşteri Ekle</h4>
                  <button onClick={() => setIsAddingCustomer(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Input 
                  placeholder="Müşteri Adı Soyadı/Firma" 
                  value={newCustomerName} 
                  onChange={(e) => setNewCustomerName(e.target.value)} 
                  className="mb-2"
                />
                <Input 
                  placeholder="Telefon (İsteğe bağlı)" 
                  value={newCustomerPhone} 
                  onChange={(e) => setNewCustomerPhone(e.target.value)} 
                />
                <Button 
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName || addCustomerMutation.isPending}
                  isLoading={addCustomerMutation.isPending}
                  size="sm"
                  className="w-full mt-3"
                >
                  Müşteriyi Kaydet ve Seç
                </Button>
              </div>
            ) : (
              <select 
                className={`w-full bg-white border rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-all ${paymentMethod === 'veresiye' && !customerId ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                <option value="">Seçiniz (İsteğe Bağlı)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {paymentMethod === 'veresiye' && !customerId && !isAddingCustomer && (
              <p className="text-xs font-bold text-red-500 mt-2">Veresiye işlem için cari seçimi zorunludur!</p>
            )}
          </div>

          <Button 
            onClick={handleCheckout} 
            disabled={isCheckingOut || (paymentMethod === 'veresiye' && !customerId)} 
            className="w-full h-14 text-lg mt-6" 
          >
            {isCheckingOut ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> İşleniyor...</> : 'Satışı Tamamla'}
          </Button>
        </div>
      </BottomSheet>

      {/* Simple Income/Expense Modal */}
      <BottomSheet isOpen={isSimpleTxOpen} onClose={() => setIsSimpleTxOpen(false)} title={txType === 'income' ? 'Gelir Ekle' : 'Masraf / Gider Ekle'}>
        <div className="space-y-5 pt-4 pb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tutar (TL)</label>
            <Input type="number" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Açıklama</label>
            <Input placeholder="Örn: Elektrik Faturası, Çaycı..." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button onClick={handleSimpleTx} disabled={!txAmount} className={`w-full mt-4 h-12 text-base ${txType === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            Kaydet
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
