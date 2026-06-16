import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { AlertTriangle } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-system-bg px-4 text-center">
      <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10 text-gray-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Sayfa Bulunamadı</h2>
      <p className="text-gray-500 max-w-sm mb-8">
        Aradığınız sayfaya ulaşılamıyor veya böyle bir sayfa hiç var olmadı. URL'yi kontrol edin veya ana sayfaya dönün.
      </p>
      <Button onClick={() => navigate('/')} variant="primary" size="lg">
        Ana Sayfaya Dön
      </Button>
    </div>
  );
};
