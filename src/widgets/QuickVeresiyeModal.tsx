import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useEntities, useAddEntity, useUpdateEntityBalance } from '@/shared/hooks/useEntities';
import { useAddFinanceTransaction } from '@/shared/hooks/useFinance';

interface QuickVeresiyeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickVeresiyeModal = ({ isOpen, onClose, onSuccess }: QuickVeresiyeModalProps) => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  
  const { data: customers = [] } = useEntities(tenantId);
  const addCustomerMutation = useAddEntity();
  const updateBalanceMutation = useUpdateEntityBalance();
  const addTransactionMutation = useAddFinanceTransaction();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!tenantId || !user || !amount) return;
    
    try {
      let customerId = selectedCustomerId;
      let currentBalance = 0;

      // Create new customer if needed
      if (mode === 'new') {
        if (!newCustomerName) return;
        const newCust = await addCustomerMutation.mutateAsync({
          tenant_id: tenantId,
          name: newCustomerName,
          balance: 0
        });
        customerId = newCust.id;
      } else {
        if (!customerId) return;
        const cust = customers.find(c => c.id === customerId);
        currentBalance = cust?.balance || 0;
      }

      const debtAmount = parseFloat(amount);
      const newBalance = currentBalance + debtAmount;

      // Update balance
      await updateBalanceMutation.mutateAsync({
        id: customerId,
        newBalance,
        tenantId
      });

      // Add transaction
      await addTransactionMutation.mutateAsync({
        tenant_id: tenantId,
        customer_id: customerId,
        user_id: user.id,
        type: 'income',
        amount: debtAmount,
        description: description || 'Hızlı Veresiye İşlemi',
        payment_method: 'veresiye'
      });

      setAmount('');
      setDescription('');
      setNewCustomerName('');
      setSelectedCustomerId('');
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch {
      toast.error('İşlem kaydedilirken hata oluştu.');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Hızlı Veresiye Ekle">
      <div className="space-y-4 pt-4 pb-8">
        <div className="flex bg-gray-100 p-1 rounded-xl w-full">
          <button 
            onClick={() => setMode('existing')} 
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${mode === 'existing' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Kayıtlı Kişi
          </button>
          <button 
            onClick={() => setMode('new')} 
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${mode === 'new' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Yeni Kişi Ekle
          </button>
        </div>

        {mode === 'existing' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Seçin</label>
            <select 
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Müşteri Seçin --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Kişi Adı Soyadı</label>
            <Input placeholder="Örn: Ahmet Yılmaz" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
          <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="text-lg font-bold text-red-600" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (İsteğe Bağlı)</label>
          <Input placeholder="Örn: 2 karton sigara, ekmek" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <Button 
          className="w-full mt-6" size="lg" 
          variant="danger"
          onClick={handleSubmit} 
          disabled={!amount || (mode === 'existing' && !selectedCustomerId) || (mode === 'new' && !newCustomerName)}
          isLoading={addTransactionMutation.isPending || addCustomerMutation.isPending || updateBalanceMutation.isPending}
        >
          Borçlandır (Veresiye Yaz)
        </Button>
      </div>
    </BottomSheet>
  );
};
