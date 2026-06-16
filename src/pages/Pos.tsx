import React, { useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { useInventory } from '@/shared/hooks/useInventory';
import { useEntities, useAddEntity } from '@/shared/hooks/useEntities';
import { Header } from '@/widgets/Header';
import { DataList } from '@/shared/ui/DataList';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { ShoppingCart, Plus, ArrowDownRight, ArrowUpRight, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

export const Pos = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: loadingProducts } = useInventory(tenantId);
  const { data: customers = [] } = useEntities(tenantId);
  const addCustomerMutation = useAddEntity();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

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
      const description = lines.map(l => `${l.quantity} ${l.name}`).join(', ');

      const { data, error } = await supabase.rpc('process_pos_sale', {
        p_tenant_id: tenantId,
        p_user_id: user.id,
        p_customer_id: customerId || null,
        p_payment_method: paymentMethod,
        p_grand_total: grandTotal,
        p_cashier_name: user?.type === 'employee' ? user?.name : 'Patron',
        p_description: description,
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
    <div className="flex flex-col h-full overflow-hidden w-full gap-4 max-w-[1600px] mx-auto">
      <div className="shrink-0 flex flex-col gap-2">
        <Header title="Hızlı Satış (POS)" subtitle="Ürün seç, sepete ekle, satışı tamamla." />
      </div>

      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div className="flex-1 w-full md:max-w-md">
          <Input 
            icon={<Search className="w-4 h-4 text-text-tertiary" />}
            placeholder="Ürün Ara (Barkod veya İsim)..." 
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 shrink-0">
          <Button variant="secondary" onClick={() => { setTxType('income'); setIsSimpleTxOpen(true); }} className="text-success border-success/20 bg-success/5 hover:bg-success/10">
            <ArrowDownRight className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Gelir Ekle</span>
          </Button>
          <Button variant="secondary" onClick={() => { setTxType('expense'); setIsSimpleTxOpen(true); }} className="text-danger border-danger/20 bg-danger/5 hover:bg-danger/10">
            <ArrowUpRight className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Masraf/Gider</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-4">
        
        {/* Tam Ekran Ürünler Grid */}
        <DataList
          className="flex-1 min-h-0 w-full"
          contentClassName="p-4 flex flex-col gap-3"
        >
          {loadingProducts ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-text-secondary font-medium">Ürün bulunamadı.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleAddProduct(p)}
                  className="bg-system-surface border border-system-border rounded-2xl p-3 cursor-pointer hover:border-primary/50 hover:bg-glass-highlight shadow-sm hover:shadow transition-all active:scale-95 group flex items-center gap-3 relative overflow-hidden"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-body text-text-primary leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors" title={p.name}>
                      {p.name}
                    </h3>
                    <p className="text-caption font-medium text-text-secondary truncate mb-1.5">
                      {(p as any).category || 'Kategorisiz'}
                    </p>
                    
                    <div className="flex items-center">
                      <span className="font-extrabold text-title-3 text-primary">{Number(p.price || 0).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>

                  {/* Stock Badge Corner */}
                  <div className={`absolute top-0 right-0 rounded-bl-xl rounded-tr-2xl px-2 py-0.5 text-micro font-bold border-b border-l ${p.stock_quantity === null ? 'bg-info/10 border-info/20 text-info' : (p.stock_quantity > 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger')}`}>
                    {p.stock_quantity === null ? 'Sınırsız' : `Stok: ${p.stock_quantity}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataList>

        {/* Hızlı Sepet (Bottom Bar / Collapsible) */}
        {lines.length > 0 && (
          <div className="shrink-0 bg-system-surface border border-system-border shadow-glass-hover rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden transition-all relative z-10 mx-auto w-full max-w-4xl">
            {/* Açılır Kapanır Ürün Listesi */}
            <AnimatePresence>
              {isCartExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="max-h-[35vh] overflow-y-auto border-b border-system-border divide-y divide-system-border"
                >
                  <div className="p-2 space-y-1 bg-system-bg/50">
                    {lines.map((line) => (
                      <div key={line.product_id} className="flex items-center justify-between gap-3 p-2 hover:bg-glass-highlight rounded-lg transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveLine(line.product_id)} className="w-8 h-8 min-h-0 p-0 text-text-tertiary hover:text-danger shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center gap-1 bg-system-bg border border-system-border rounded p-0.5 shrink-0">
                            <Button variant="secondary" size="sm" onClick={() => handleUpdateLineQuantity(line.product_id, -1)} className="w-6 h-6 min-h-0 p-0 rounded text-text-secondary font-bold">-</Button>
                            <span className="w-6 text-center text-body font-bold text-text-primary">{line.quantity}</span>
                            <Button variant="secondary" size="sm" onClick={() => handleUpdateLineQuantity(line.product_id, 1)} className="w-6 h-6 min-h-0 p-0 rounded text-text-secondary font-bold">+</Button>
                          </div>
                          <span className="font-bold text-body text-text-primary truncate">{line.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-caption text-text-secondary font-medium">{Number(line.unit_price).toLocaleString('tr-TR')} ₺</div>
                          <span className="font-extrabold text-title-3 text-primary">{Number(line.total).toLocaleString('tr-TR')} ₺</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Alt Toplam ve Ödeme Butonu */}
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-system-surface">
              <div 
                className="flex items-center gap-3 cursor-pointer group flex-1 w-full sm:w-auto"
                onClick={() => setIsCartExpanded(!isCartExpanded)}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 relative transition-transform active:scale-95">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 flex items-center justify-center px-1.5 h-5 min-w-[20px] rounded-full bg-danger text-white text-[10px] font-black shadow-sm">
                    {lines.reduce((acc, l) => acc + l.quantity, 0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-bold text-text-secondary uppercase tracking-wider">Genel Toplam</span>
                    <span className="text-micro font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 transition-colors group-hover:bg-primary/20">
                      {isCartExpanded ? 'Sepeti Gizle' : 'Sepeti Gör'}
                    </span>
                  </div>
                  <div className="font-extrabold text-title-2 text-text-primary tracking-tight">{grandTotal.toLocaleString('tr-TR')} ₺</div>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="w-full sm:w-auto shrink-0 shadow-xl shadow-primary/25" 
                onClick={() => setIsCheckoutOpen(true)}
              >
                ÖDEME AL
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <BottomSheet isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Ödeme Al">
        <div className="space-y-6 pt-4 pb-8">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-caption font-bold text-primary mb-1 uppercase tracking-wider">Tahsil Edilecek Tutar</p>
            <p className="text-title-1 font-extrabold text-text-primary">{grandTotal.toLocaleString('tr-TR')} ₺</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-secondary mb-3">Ödeme Yöntemi</label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => setPaymentMethod('cash')}
                variant={paymentMethod === 'cash' ? 'primary' : 'secondary'}
                size="lg"
              >
                Nakit
              </Button>
              <Button
                onClick={() => setPaymentMethod('credit_card')}
                variant={paymentMethod === 'credit_card' ? 'primary' : 'secondary'}
                size="lg"
              >
                Kredi Kartı
              </Button>
              <Button
                onClick={() => setPaymentMethod('veresiye')}
                variant={paymentMethod === 'veresiye' ? 'danger' : 'secondary'}
                size="lg"
              >
                Veresiye
              </Button>
            </div>
          </div>

          <div className={`transition-all duration-300 ${paymentMethod === 'veresiye' ? 'opacity-100 block' : 'opacity-60 block'}`}>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-text-secondary">Müşteri Seçimi {paymentMethod === 'veresiye' && <span className="text-danger">*</span>}</label>
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
              <div className="bg-system-bg border border-system-border rounded-xl p-3 mb-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-text-secondary uppercase">Hızlı Müşteri Ekle</h4>
                  <button onClick={() => setIsAddingCustomer(false)} className="text-text-tertiary hover:text-text-secondary">
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
                className="glass-input w-full cursor-pointer"
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
              <p className="text-xs font-bold text-danger mt-2">Veresiye işlem için cari seçimi zorunludur!</p>
            )}
          </div>

          <Button 
            onClick={handleCheckout} 
            disabled={isCheckingOut || (paymentMethod === 'veresiye' && !customerId)} 
            size="lg"
            fullWidth
            className="mt-6" 
          >
            {isCheckingOut ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> İşleniyor...</> : 'Satışı Tamamla'}
          </Button>
        </div>
      </BottomSheet>

      {/* Simple Income/Expense Modal */}
      <BottomSheet isOpen={isSimpleTxOpen} onClose={() => setIsSimpleTxOpen(false)} title={txType === 'income' ? 'Gelir Ekle' : 'Masraf / Gider Ekle'}>
        <div className="space-y-5 pt-4 pb-8">
          <div>
            <label className="block text-sm font-bold text-text-secondary mb-2">Tutar (TL)</label>
            <Input type="number" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-secondary mb-2">Açıklama</label>
            <Input placeholder="Örn: Elektrik Faturası, Çaycı..." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button onClick={handleSimpleTx} disabled={!txAmount} variant={txType === 'expense' ? 'danger' : 'primary'} size="lg" fullWidth className="mt-4">
            Kaydet
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
