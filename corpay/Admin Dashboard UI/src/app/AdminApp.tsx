import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LoginPage } from './components/admin/LoginPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { RevenuePage } from './components/admin/pages/RevenuePage';
import { PostsPage } from './components/admin/pages/PostsPage';
import { EmployeesPage } from './components/admin/pages/EmployeesPage';
import { PaymentsPage } from './components/admin/pages/PaymentsPage';
import { ChartsPage } from './components/admin/pages/ChartsPage';
import { SwitchScreenPage } from './components/admin/pages/SwitchScreenPage';
import { Toaster } from './components/ui/sonner';
import backgroundImage from '@/assets/1982c62f1043d0e3d361d49e0372821eee7f547d.png';

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <Toaster />
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/admin" replace />
              ) : (
                <LoginPage onLogin={() => setIsAuthenticated(true)} />
              )
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              isAuthenticated ? (
                <AdminLayout onLogout={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setIsAuthenticated(false);
                }}>
                  <Routes>
                    <Route index element={<Navigate to="/admin/revenue" replace />} />
                    <Route path="revenue" element={<RevenuePage />} />
                    <Route path="posts" element={<PostsPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="charts" element={<ChartsPage />} />
                    <Route path="switch-screen" element={<SwitchScreenPage />} />
                  </Routes>
                </AdminLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}