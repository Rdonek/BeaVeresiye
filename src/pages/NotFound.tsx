import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { AlertTriangle } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-system-bg px-4 text-center">
      <div className="h-20 w-20 bg-glass-highlight rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10 text-text-tertiary" />
      </div>
      <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
      <h2 className="text-xl font-semibold text-text-secondary mb-4">Sayfa Bulunamadı</h2>
      <p className="text-text-tertiary max-w-sm mb-8">
        Aradığınız sayfaya ulaşılamıyor veya böyle bir sayfa hiç var olmadı. URL'yi kontrol edin veya ana sayfaya dönün.
      </p>
      <Button onClick={() => navigate('/')} variant="primary" size="lg">
        Ana Sayfaya Dön
      </Button>
    </div>
  );
};
