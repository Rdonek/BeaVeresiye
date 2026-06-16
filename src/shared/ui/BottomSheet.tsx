import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet = ({ isOpen, onClose, title, subtitle, children, className }: BottomSheetProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 transition-opacity"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-system-surface/90 backdrop-blur-glass-heavy shadow-glass border-t border-system-border",
              "pb-[var(--safe-area-bottom)]",
              className
            )}
          >
            <div className="sticky top-0 z-10 bg-system-surface/90 backdrop-blur-md border-b border-system-border/50 px-6 py-4 rounded-t-3xl flex items-center justify-between">
              <div>
                <h3 className="text-title-2 text-text-primary">{title}</h3>
                {subtitle && (
                  <p className="text-subhead text-text-secondary mt-0.5">{subtitle}</p>
                )}
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-text-secondary hover:bg-glass-highlight rounded-full transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
