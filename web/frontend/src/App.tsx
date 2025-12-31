/**
 * gschpoozi Web Configurator
 * Main application entry point
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KinematicsSelect } from './pages/KinematicsSelect';
import { Configurator } from './pages/Configurator';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing - Kinematics Selection */}
          <Route path="/" element={<KinematicsSelect />} />
          <Route path="/select-kinematics" element={<KinematicsSelect />} />

          {/* Main Configurator */}
          <Route path="/configurator" element={<Configurator />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
