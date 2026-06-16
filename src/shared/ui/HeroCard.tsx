import React from 'react';

export const HeroCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-hero-bg rounded-2xl p-4 text-hero-text shadow-sm border border-hero-border flex flex-col gap-3 ${className}`}>
    {children}
  </div>
);

HeroCard.Header = ({ title, value, unit, icon, extra }: any) => (
  <div className="flex flex-col items-center text-center">
    <p className="text-hero-muted text-micro font-bold uppercase tracking-widest flex items-center justify-center gap-1">
      {icon} {title}
    </p>
    <div className="flex items-baseline gap-1 mt-0.5">
      <h2 className="text-title-1 font-black tracking-tight text-hero-text">{value}</h2>
      {unit && <span className="text-body font-bold text-hero-muted opacity-80">{unit}</span>}
    </div>
    {extra}
  </div>
);

HeroCard.Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-3 lg:gap-4 border-t border-hero-border/80 pt-4">
    {children}
  </div>
);

HeroCard.Stat = ({ title, value, unit, icon, indicator, isRight }: any) => (
  <div className={`flex flex-col items-center justify-center ${isRight ? 'border-l border-hero-border/80' : ''}`}>
    {icon ? (
      <div className="flex items-center gap-1 text-hero-muted mb-1">
        {icon}
        <p className="text-caption font-bold uppercase tracking-wider text-hero-muted">{title}</p>
      </div>
    ) : (
      <p className="text-caption text-hero-muted font-bold uppercase tracking-wider mb-1">{title}</p>
    )}
    <div className="flex items-baseline gap-1">
      <span className="text-title-3 font-bold text-hero-text">{value}</span>
      {unit && <span className="text-caption lg:text-body text-hero-muted opacity-80">{unit}</span>}
      {indicator}
    </div>
  </div>
);
