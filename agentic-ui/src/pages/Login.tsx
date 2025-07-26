import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Link,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth"; // <-- Custom hook for auth state

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { setIsLoggedIn } = useAuth();

  // --- Local login handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/users/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      setIsLoggedIn(true);
      setPassword(""); // Clear password after login
      navigate("/dashboard");
    } catch (err) {
      setPassword(""); // Clear password for security
      // Try to parse error from Axios
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "detail" in err.response.data
      ) {
        setError(
          (err as { response: { data: { detail: string } } }).response.data
            .detail
        );
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- SSO handler (stub for future use)
  const handleSSOLogin = () => {
    // Change the URL below when you implement SSO
    window.location.href = "http://localhost:8000/auth/login";
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400, mx: "auto", mt: 8 }}
    >
      <Typography variant="h5" align="center" mb={2}>
        Login to Company Portal
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Email"
        type="email"
        required
        value={email}
        autoComplete="username"
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
      />
      <TextField
        label="Password"
        type="password"
        required
        value={password}
        autoComplete="current-password"
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />
      <Button
        variant="contained"
        color="primary"
        type="submit"
        disabled={loading}
        fullWidth
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Login"}
      </Button>

      {/* Divider and SSO Button */}
      <Stack direction="row" alignItems="center" spacing={1} mt={2} mb={1}>
        <Divider sx={{ flex: 1 }} />
        <Typography variant="body2" color="textSecondary">
          OR
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Stack>
      <Button
        variant="outlined"
        color="secondary"
        onClick={handleSSOLogin}
        fullWidth
        disabled={loading}
        sx={{ textTransform: "none" }}
      >
        {/* Replace with SSO provider icon as needed */}
        Sign in with SSO (Microsoft/Google)
      </Button>

      {/* Links */}
      <Box display="flex" justifyContent="space-between" mt={2}>
        <Link href="/register" underline="hover">
          Don't have an account? Register
        </Link>
        <Link href="/request-password-reset" underline="hover">
          Forgot password?
        </Link>
      </Box>
    </Box>
  );
};

export default Login;
