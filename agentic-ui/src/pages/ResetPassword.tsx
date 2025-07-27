import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import api from '../api/client';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = params.get('token');
    if (!token) {
      setError('No token found.');
      return;
    }
    try {
      await api.post('/users/reset-password', { token, new_password: newPassword });
      setMessage('Password reset successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      let msg = "An unexpected error occurred";
      if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    }

  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5">Reset Password</Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="New Password" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      <Button variant="contained" color="primary" type="submit">Reset Password</Button>
    </Box>
  );
};

export default ResetPassword;
