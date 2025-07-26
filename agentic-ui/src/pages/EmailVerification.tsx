import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import api from '../api/client';
import { useSearchParams } from 'react-router-dom';

const EmailVerification: React.FC = () => {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      api.get(`/users/verify-email?token=${token}`)
        .then(() => setMessage('Email verified! You can now log in.'))
        .catch(() => setMessage('Invalid or expired token.'))
        .finally(() => setLoading(false));
    } else {
      setMessage('No token provided.');
      setLoading(false);
    }
  }, [params]);

  return (
    <Box>
      <Typography variant="h5">Verify Email</Typography>
      {loading ? <CircularProgress /> : <Alert severity={message.includes('verified') ? "success" : "error"}>{message}</Alert>}
    </Box>
  );
};

export default EmailVerification;
