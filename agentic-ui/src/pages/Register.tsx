import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Link,
  CircularProgress,
  Paper,
} from '@mui/material';
import api from '../api/client'; // Your configured Axios instance
import axios from 'axios';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);


  // Simple frontend validation
  const validate = () => {
    if (!email.match(/^[\w.-]+@[\w.-]+\.\w+$/)) {
      setError('Enter a valid email address.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    try {
  await api.post('/users/register', { email, password });
  setSuccess('Check your email for a verification link.');
  setEmail('');
  setPassword('');
} catch (error) {
  let msg = 'Registration failed. Try again.';
  if (axios.isAxiosError(error)) {
    msg = error.response?.data?.detail || error.message || msg;
  } else if (error instanceof Error) {
    msg = error.message;
  }
  setError(msg);
}
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ bgcolor: '#f5f6fa' }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, minWidth: 340 }}>
        <Typography variant="h4" fontWeight={700} mb={2} textAlign="center" color="primary">
          Agentic AI Register
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit} autoComplete="off">
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            margin="normal"
            autoFocus
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            margin="normal"
            autoComplete="new-password"
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </form>
        <Typography mt={2} textAlign="center">
          <Link href="/login" underline="hover">
            Already have an account? Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;
