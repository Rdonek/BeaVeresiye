import React, { useRef, useState } from 'react';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { FileSpreadsheet, Download, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/shared/api/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getFriendlyErrorMessage } from '@/shared/lib/errorHandler';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, tenantId }) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Ürün Adı": "Örnek Ürün",
        "Satış Fiyatı": 150.50,
        "Stok (Opsiyonel)": 50,
        "Birim (Opsiyonel)": "Adet",
        "Barkod (Opsiyonel)": "8691234567890"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
    XLSX.writeFile(wb, "Urun_Sablonu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("Excel dosyası boş.");
          setIsImporting(false);
          return;
        }

        const newProducts = data.map((row: any) => {
          const name = row["Ürün Adı"];
          const price = parseFloat(row["Satış Fiyatı"]);
          
          if (!name || isNaN(price)) {
            throw new Error(`Hatalı satır algılandı: Ürün Adı ve Satış Fiyatı zorunludur. (Satır verisi: ${JSON.stringify(row)})`);
          }

          return {
            tenant_id: tenantId,
            name: String(name).trim(),
            price: price,
            stock_quantity: row["Stok (Opsiyonel)"] ? parseFloat(row["Stok (Opsiyonel)"]) : null,
            unit: row["Birim (Opsiyonel)"] ? String(row["Birim (Opsiyonel)"]) : 'Adet',
            barcode: row["Barkod (Opsiyonel)"] ? String(row["Barkod (Opsiyonel)"]) : null
          };
        });

        const { error } = await supabase.from('products').insert(newProducts);
        
        if (error) throw error;

        toast.success(`${newProducts.length} adet ürün başarıyla içe aktarıldı!`);
        queryClient.invalidateQueries({ queryKey: ['inventory', tenantId] });
        onClose();
      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(getFriendlyErrorMessage(error));
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Excel İle Ürün Yükle">
      <div className="py-4 space-y-6">
        
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-primary leading-relaxed">
            <p className="font-bold mb-1">Nasıl Yüklenir?</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
              <li>Önce boş şablonu bilgisayarınıza indirin.</li>
              <li>İçini ürünlerinizle doldurup kaydedin.</li>
              <li>Doldurduğunuz dosyayı sisteme yükleyin.</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleDownloadTemplate}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-gray-600 hover:text-primary group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <Download className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm">Şablon İndir</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-gray-600 hover:text-green-600 group relative"
          >
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm">{isImporting ? 'Yükleniyor...' : 'Dosya Seç'}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </button>
        </div>

      </div>
    </BottomSheet>
  );
};
