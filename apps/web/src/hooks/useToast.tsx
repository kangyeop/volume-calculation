import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export function useToast() {
  return {
    toast: ({ title, description, variant = 'default' }: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
      if (variant === 'destructive') {
        sonnerToast.error(title, {
          description,
        });
      } else {
        sonnerToast.success(title, {
          description,
        });
      }
    },
  };
}

export const Toaster = SonnerToaster;
