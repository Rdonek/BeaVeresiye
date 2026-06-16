import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Search, Package, Plus, ChevronRight, Edit, Trash2, ArrowUpRight, ArrowDownLeft, X, Loader2, FileSpreadsheet, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { ExcelImportModal } from '@/widgets/ExcelImportModal';
import { useInventory, useAddProduct, useUpdateProduct, useDeleteProduct } from '@/shared/hooks/useInventory';
import type { Product } from '@/shared/hooks/useInventory';
import { Header } from '@/widgets/Header';
import { GlassCard as Card } from '@/shared/ui/GlassCard';

export const Inventory = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  
  const { data: products = [], isLoading: loading } = useInventory(tenantId);
  const addProductMutation = useAddProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('Adet');
  const [barcode, setBarcode] = useState('');

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setPrice(product.price.toString());
      setStock(product.stock_quantity !== null ? product.stock_quantity.toString() : '');
      setUnit(product.unit || 'Adet');
      setBarcode(product.barcode || '');
    } else {
      setEditingProduct(null);
      setName('');
      setPrice('');
      setStock('');
      setUnit('Adet');
      setBarcode('');
    }
    setIsAddOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!name || !price || !tenantId) return;
    
    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          tenant_id: tenantId,
          name,
          price: parseFloat(price),
          stock_quantity: stock ? parseInt(stock) : null,
          unit: unit || 'Adet',
          barcode: barcode || null,
        });
      } else {
        await addProductMutation.mutateAsync({
          tenant_id: tenantId,
          name,
          price: parseFloat(price),
          stock_quantity: stock ? parseInt(stock) : null,
          unit: unit || 'Adet',
          barcode: barcode || null,
        });
      }

      setIsAddOpen(false);
    } catch {
      toast.error('Ürün kaydedilirken hata oluştu.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct || !tenantId) return;
    if (!window.confirm(`${editingProduct.name} ürününü silmek istediğinize emin misiniz?`)) return;
    
    try {
      await deleteProductMutation.mutateAsync({
        id: editingProduct.id,
        tenant_id: tenantId
      });
      setIsAddOpen(false);
    } catch {
      toast.error('Ürün silinirken hata oluştu. Başka bir işlemde kullanılıyor olabilir.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.includes(search))
  );

  const isSaving = addProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="flex flex-col gap-6 w-full">
      <Header title="Stok ve Envanter" subtitle="Ürünlerinizi ve stok durumunu yönetin." />

      {/* Top Bar: Search & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-2">
        <div className="w-full md:max-w-md">
          <Input 
            icon={<Search className="w-4 h-4" />} 
            placeholder="Ürün veya barkod ara..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => navigate('/pos')} 
            className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/5"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Hızlı Satışa Git
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setIsImportOpen(true)} 
            className="flex-1 md:flex-none border-gray-200"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            İçe Aktar
          </Button>
          <Button onClick={() => openModal()} className="flex-1 md:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Product List */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Ürün Listesi</h3>
        </div>
        
        {loading ? (
          <div className="h-full flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-full pt-4">
            <EmptyState 
              icon={Package}
              title={search ? 'Sonuç bulunamadı' : 'Henüz ürün yok'}
              description={search ? 'Arama kriterlerinize uyan bir ürün bulunamadı.' : 'Sisteme henüz hiç ürün eklemediniz. Hemen yeni bir ürün ekleyerek stoklarınızı yönetmeye başlayın.'}
              actionLabel={search ? undefined : 'Yeni Ürün Ekle'}
              actionIcon={Plus}
              onAction={search ? undefined : () => { openModal(); }}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {filteredProducts.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                  onClick={() => openModal(p)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.stock_quantity !== null ? `Stok: ${p.stock_quantity} ${p.unit || 'Adet'}` : 'Sınırsız Stok'}
                        {p.barcode && <span className="ml-2 text-gray-400">| Barkod: {p.barcode}</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      {p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}>
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı*</label>
            <Input 
              placeholder="Örn: Coca Cola 1L" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı* (₺)</label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Stok</label>
              <Input 
                type="number"
                placeholder="Boş = Sınırsız" 
                value={stock} 
                onChange={e => setStock(e.target.value)} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <select 
                value={unit} 
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              >
                <option value="Adet">Adet</option>
                <option value="Kg">Kg</option>
                <option value="Gram">Gram</option>
                <option value="Litre">Litre</option>
                <option value="Paket">Paket</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barkod</label>
              <Input 
                placeholder="Okut veya yaz" 
                value={barcode} 
                onChange={e => setBarcode(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            {editingProduct && (
              <Button 
                variant="danger"
                className="flex-shrink-0 px-4"
                onClick={handleDeleteProduct}
                disabled={deleteProductMutation.isPending || isSaving}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            <Button 
              className="flex-1" 
              size="lg"
              onClick={handleSaveProduct} 
              disabled={!name || !price || isSaving}
              isLoading={isSaving}
            >
              {editingProduct ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ExcelImportModal 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        tenantId={tenantId!}
      />
    </div>
  );
};
