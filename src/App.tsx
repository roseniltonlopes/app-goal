import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GoalDataProvider } from '@/contexts/GoalDataContext';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WeeklyPlannerPage } from '@/pages/WeeklyPlannerPage';
import { MyDayPage } from '@/pages/MyDayPage';
import { EvolutionPage } from '@/pages/EvolutionPage';
import { SettingsPage } from '@/pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-text-primary text-bg-primary flex items-center justify-center font-bold text-lg animate-pulse">
            G
          </div>
          <span className="text-xs font-mono text-text-secondary">
            Carregando GOAL...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GoalDataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="planejamento" element={<WeeklyPlannerPage />} />
                <Route path="meu-dia" element={<MyDayPage />} />
                <Route path="evolucao" element={<EvolutionPage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GoalDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
