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
import { DataList } from '@/shared/ui/DataList';

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
    <Button 
      variant="secondary"
      fullWidth
      onClick={() => togglePerm(field)}
      className={`justify-between py-3 px-4 h-auto ${perms[field] ? 'border-primary/50 shadow-sm' : ''}`}
    >
      <span className="font-semibold text-text-primary">{label}</span>
      {perms[field] ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-text-tertiary" />}
    </Button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden w-full max-w-[1600px] mx-auto gap-4">
      <div className="shrink-0 flex flex-col gap-4">
        <Header 
          title="Personel ve Roller" 
          subtitle="Personelinizi ve yetkilerini yönetin."
          backTo="/settings"
          rightElement={
            <Button 
              variant="secondary"
              size="icon"
              onClick={openAddModal}
            >
              <UserPlus className="w-5 h-5" />
            </Button>
          }
        />
      </div>

      <DataList>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-system-surface/30 rounded-2xl w-full"></div>
            <div className="h-24 bg-system-surface/30 rounded-2xl w-full"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-10 opacity-60">
            <Shield className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="font-headline text-text-secondary">Henüz kayıtlı personel yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-system-border/50">
            {employees.map((emp: any) => (
              <motion.div 
                key={emp.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:px-6 hover:bg-glass-highlight transition-colors flex items-center justify-between group"
              >
                <div>
                  <h3 className="font-semibold text-text-primary text-body mb-1">{emp.name}</h3>
                  <p className="text-caption text-text-secondary mb-3">{emp.phone || 'Telefon Yok'}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {(emp.permissions as any)?.pos && <span className="px-2 py-0.5 bg-primary/10 text-primary text-micro font-bold rounded-md border border-primary/20">POS</span>}
                    {(emp.permissions as any)?.inventory && <span className="px-2 py-0.5 bg-success/10 text-success text-micro font-bold rounded-md border border-success/20">STOK</span>}
                    {(emp.permissions as any)?.customers && <span className="px-2 py-0.5 bg-warning/10 text-warning text-micro font-bold rounded-md border border-warning/20">MÜŞTERİ</span>}
                    {(emp.permissions as any)?.dashboard && <span className="px-2 py-0.5 bg-info/10 text-info text-micro font-bold rounded-md border border-info/20">ÖZET</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(emp)}
                    title="Düzenle"
                    className="text-primary hover:bg-primary/10"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(emp.id)}
                    title="Sil"
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </DataList>

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
