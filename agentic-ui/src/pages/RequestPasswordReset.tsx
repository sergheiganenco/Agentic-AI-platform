import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import api from '../api/client';

const RequestPasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/users/request-password-reset', { email });
      setMessage('If that email is registered, you’ll receive a reset email.');
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
      <Typography variant="h5">Request Password Reset</Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <Button variant="contained" color="primary" type="submit">Send Reset Link</Button>
    </Box>
  );
};

export default RequestPasswordReset;
