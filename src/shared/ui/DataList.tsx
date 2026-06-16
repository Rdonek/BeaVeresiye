import React, { type ReactNode } from 'react';

interface DataListProps {
  /**
   * Üst bilgi alanı. Verilirse, sabit (sticky/fixed) bir başlık/arama çerçevesi olarak
   * listenin tepesinde konumlanır.
   */
  header?: ReactNode;
  
  /**
   * Listenin kendisi (kaydırılabilir içerik).
   */
  children: ReactNode;
  
  /**
   * En dış çerçeveye eklenecek ekstra sınıflar.
   */
  className?: string;
  
  /**
   * Sadece kaydırılabilir iç alana eklenecek ekstra sınıflar.
   */
  contentClassName?: string;
}

/**
 * Uygulama genelinde tüm listeleri, tabloları ve grid yapılarını sarmalaması gereken
 * ortak kapsayıcı bileşen. "Sıfır Sayfa Kaydırması" kuralına uygun olarak
 * `flex-1 min-h-0 overflow-hidden` yapısını sağlar.
 */
export const DataList = ({ 
  header, 
  children, 
  className = '', 
  contentClassName = '' 
}: DataListProps) => {
  return (
    <div className={`flex-1 overflow-hidden flex flex-col bg-system-surface border border-system-border shadow-sm rounded-2xl min-h-0 ${className}`}>
      {header && (
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-system-border bg-system-bg/50">
          {header}
        </div>
      )}
      <div className={`flex-1 min-h-0 overflow-y-auto ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
