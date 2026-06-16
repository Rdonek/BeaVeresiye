import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, Trash2, CheckSquare, Square, Edit2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Header } from '@/widgets/Header';
import { GlassCard } from '@/shared/ui/GlassCard';
import { motion } from 'framer-motion';
import { useEmployees } from '@/shared/hooks/useEmployees';

export const Employees = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  
  const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee } = useEmployees(tenantId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  
  const [perms, setPerms] = useState({
    pos: true,
    inventory: false,
    customers: true,
    dashboard: false
  });

  const openAddModal = () => {
    setEditingId(null);
    setNewName('');
    setNewPhone('');
    setNewPin('');
    setPerms({ pos: true, inventory: false, customers: true, dashboard: false });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setEditingId(emp.id);
    setNewName(emp.name);
    setNewPhone(emp.phone);
    setNewPin(''); // Security: don't show existing pin, let them type a new one to change it
    setPerms(emp.permissions as any);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!newName || !newPhone || (!newPin && !editingId)) return;

    let cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    
    if (cleanPhone.length !== 10) {
      toast.error("Hata: Geçerli 10 haneli bir telefon numarası girin.");
      return;
    }
    
    if (newPin && newPin.length !== 6) {
      toast.error("Hata: PIN kodu tam olarak 6 haneli olmalıdır.");
      return;
    }
    
    const formattedPhone = `0${cleanPhone}`;

    const payload: any = {
      name: newName,
      phone: formattedPhone,
      permissions: perms,
      tenant_id: tenantId
    };
    
    if (newPin) {
      payload.pin_code = newPin;
    }

    try {
      if (editingId) {
        await updateEmployee.mutateAsync({ id: editingId, updates: payload });
      } else {
        await addEmployee.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error("Hata: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu personeli silmek istediğinizden emin misiniz?")) {
      try {
        await deleteEmployee.mutateAsync(id);
      } catch (error: any) {
        toast.error("Hata: " + error.message);
      }
    }
  };

  const togglePerm = (key: keyof typeof perms) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PermCheckbox = ({ label, field }: { label: string, field: keyof typeof perms }) => (
    <button 
      onClick={() => togglePerm(field)}
      className="flex items-center justify-between w-full p-4 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
    >
      <span className="font-semibold text-gray-900">{label}</span>
      {perms[field] ? <CheckSquare className="h-6 w-6 text-primary" /> : <Square className="h-6 w-6 text-gray-400" />}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <Header 
        title="Personel ve Roller" 
        subtitle="Personelinizi ve yetkilerini yönetin."
        backTo="/settings"
      />

      <GlassCard variant="panel" padding="sm" className="min-h-[50vh] flex flex-col gap-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-white/30 rounded-2xl w-full"></div>
            <div className="h-24 bg-white/30 rounded-2xl w-full"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-10 opacity-60">
            <Shield className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="font-headline text-text-secondary">Henüz kayıtlı personel yok.</p>
          </div>
        ) : (
          employees.map((emp: any) => (
            <motion.div 
              key={emp.id} 
              whileHover={{ y: -2 }}
              className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 relative"
            >
              <div className="absolute top-5 right-5 flex items-center space-x-2">
                <button 
                  onClick={() => openEditModal(emp)}
                  className="h-8 w-8 flex items-center justify-center rounded-md bg-primary/5 hover:bg-primary/10 text-primary transition-colors border border-primary/20"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(emp.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors border border-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 pr-24">{emp.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{emp.phone}</p>
              
              <div className="flex flex-wrap gap-2">
                {(emp.permissions as any)?.pos && <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20">POS</span>}
                {(emp.permissions as any)?.inventory && <span className="px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-lg border border-success/20">Inventory</span>}
                {(emp.permissions as any)?.customers && <span className="px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-lg border border-warning/20">Customers</span>}
                {(emp.permissions as any)?.dashboard && <span className="px-3 py-1 bg-info/10 text-info text-xs font-bold rounded-lg border border-info/20">Dashboard</span>}
              </div>
            </motion.div>
          ))
        )}
      </GlassCard>

      <div className="fixed bottom-24 lg:bottom-10 left-0 right-0 p-4 z-20 flex justify-center pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <Button fullWidth size="lg" className="shadow-lg" onClick={openAddModal}>
            <UserPlus className="h-5 w-5 mr-2" />
            Yeni Personel Ekle
          </Button>
        </div>
      </div>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Personeli Düzenle" : "Yeni Personel Kaydı"}>
        <div className="space-y-6 pt-2 pb-8">
          <div className="space-y-4">
            <div>
              <label className="ml-1 mb-2 block font-subhead text-text-secondary">Ad Soyad</label>
              <Input placeholder="Ahmet Yılmaz" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="ml-1 mb-2 block font-subhead text-text-secondary">Telefon Numarası (Giriş ID)</label>
              <Input placeholder="0555..." type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
            <div>
              <label className="ml-1 mb-2 block font-subhead text-text-secondary">6 Haneli PIN Kodu</label>
              <Input 
                placeholder={editingId ? "PIN'i Değiştir (İsteğe Bağlı)" : "145399"} 
                type="text" 
                inputMode="numeric"
                maxLength={6}
                value={newPin} 
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
              />
            </div>
          </div>

          <div>
            <h3 className="font-subhead text-text-secondary uppercase tracking-wider mb-3 ml-2">Erişim Yetkileri (Roller)</h3>
            <div className="space-y-3">
              <PermCheckbox label="POS Ekranı" field="pos" />
              <PermCheckbox label="Müşteriler ve Veresiye" field="customers" />
              <PermCheckbox label="Stok ve Envanter" field="inventory" />
              <PermCheckbox label="Ana Sayfa ve İstatistikler" field="dashboard" />
            </div>
          </div>

          <Button fullWidth size="lg" className="mt-6" onClick={handleSaveEmployee} disabled={!newName || !newPhone || (!newPin && !editingId)}>
            {editingId ? "Değişiklikleri Kaydet" : "Kaydet ve Yetki Ver"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
