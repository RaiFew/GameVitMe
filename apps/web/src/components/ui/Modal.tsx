import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-black dark:text-white p-6 shadow-2xl z-10",
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            {title && (
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white mb-4 pr-8">
                {title}
              </h3>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
