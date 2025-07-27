
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailVerification from './pages/EmailVerification';
import RequestPasswordReset from './pages/RequestPasswordReset';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import UsersList from "./pages/UsersList";
import AdminUserList from "./pages/AdminUserList";
import AdminDataSources from "./pages/AdminDataSources";
import ScanWizard from "./components/ScanWizard/ScanWizard";
import ScanHistory from "./pages/ScanHistory";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes without Layout */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/request-password-reset" element={<RequestPasswordReset />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Private routes wrapped with Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/users" element={<UsersList />} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUserList /></ProtectedRoute>} />
        <Route path="/dashboard/data-sources" element={<ProtectedRoute><AdminDataSources /></ProtectedRoute>} />
        <Route path="/scan-wizard" element={<ProtectedRoute><ScanWizard /></ProtectedRoute>} />
        <Route path="/scan-history" element={<ProtectedRoute><ScanHistory /></ProtectedRoute>} />

        

      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
