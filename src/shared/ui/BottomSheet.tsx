import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet = ({ isOpen, onClose, title, children, className }: BottomSheetProps) => {
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
            className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white/80 backdrop-blur-glass-heavy shadow-glass border-t border-white",
              "pb-[var(--safe-area-bottom)]",
              className
            )}
          >
            <div className="sticky top-0 z-10 bg-white/50 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/40">
              {title ? (
                <h3 className="text-title-2 font-semibold text-primary">{title}</h3>
              ) : <div />}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/60 transition-colors"
              >
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
