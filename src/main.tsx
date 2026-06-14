import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import App from './app/App.tsx'
import { AdminApp } from './admin/AdminApp.tsx'
import { getFriendlyErrorMessage } from './shared/lib/errorHandler.ts'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Query Error:', error);
      toast.error(getFriendlyErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Mutation Error:', error);
      toast.error(getFriendlyErrorMessage(error));
    },
  }),
});

const isAdminRoute = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
          },
        }} 
      />
      {isAdminRoute ? <AdminApp /> : <App />}
    </QueryClientProvider>
  </StrictMode>,
)
