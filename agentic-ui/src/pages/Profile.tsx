import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import api from "../api/client";

interface UserProfile {
  email: string;
  name: string;
  role: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Omit<UserProfile, "role">>({ name: "", email: "" });
  const [loading, setLoading] = useState(true);

  // Snackbar states
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password dialog states
  const [pwOpen, setPwOpen] = useState(false);
  const [pwFields, setPwFields] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    api.get<UserProfile>("/users/me", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => {
        setProfile(res.data);
        setEditValues({ name: res.data.name || "", email: res.data.email });
      })
      .catch(() => setError("Could not fetch profile"))
      .finally(() => setLoading(false));
  }, []);

  // Handle edit field change
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  // Save profile
  const handleSave = async () => {
    try {
      const res = await api.put<UserProfile>(
        "/users/me",
        { name: editValues.name },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setProfile(res.data);
      setSuccess("Profile updated!");
      setEditMode(false);
    } catch {
      setError("Failed to update profile");
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditValues({ name: profile?.name || "", email: profile?.email || "" });
    setEditMode(false);
  };

  // Change password handlers
  const handlePwField = (e: ChangeEvent<HTMLInputElement>) => {
    setPwFields({ ...pwFields, [e.target.name]: e.target.value });
  };

  const handleOpenPwDialog = () => {
    setPwFields({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPwError(null);
    setPwSuccess(null);
    setPwOpen(true);
  };

  const handleClosePwDialog = () => {
    setPwOpen(false);
    setPwFields({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(false);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!pwFields.oldPassword || !pwFields.newPassword) {
      setPwError("All fields are required.");
      return;
    }
    if (pwFields.newPassword !== pwFields.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwFields.newPassword.length < 6) {
      setPwError("New password should be at least 6 characters.");
      return;
    }

    setPwLoading(true);
    try {
      await api.post(
        "/users/change-password",
        {
          old_password: pwFields.oldPassword,
          new_password: pwFields.newPassword
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setPwSuccess("Password changed!");
      setTimeout(() => setPwOpen(false), 1200);
    } catch {
      setPwError("Failed to change password. Check your old password.");
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", my: 5, p: 3, bgcolor: "white", borderRadius: 3, boxShadow: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Profile</Typography>
      <Divider sx={{ mb: 2 }} />

      <Stack gap={2}>
        <TextField
          label="Email"
          name="email"
          value={editValues.email}
          disabled
          fullWidth
        />
        <TextField
          label="Name"
          name="name"
          value={editValues.name}
          onChange={handleFieldChange}
          disabled={!editMode}
          fullWidth
        />
        <TextField
          label="Role"
          name="role"
          value={profile?.role || ""}
          disabled
          fullWidth
        />
      </Stack>

      <Stack direction="row" gap={2} sx={{ mt: 3 }}>
        {editMode ? (
          <>
            <Button variant="contained" color="primary" onClick={handleSave}>Save</Button>
            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setEditMode(true)}
            variant="outlined"
            color="primary"
          >
            Edit
          </Button>
        )}
        <Button
          startIcon={<LockIcon />}
          variant="outlined"
          color="warning"
          onClick={handleOpenPwDialog}
        >
          Change Password
        </Button>
      </Stack>

      {/* Snackbar notifications */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onClose={handleClosePwDialog} fullWidth maxWidth="xs">
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Current Password"
              type="password"
              name="oldPassword"
              value={pwFields.oldPassword}
              onChange={handlePwField}
              autoFocus
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              name="newPassword"
              value={pwFields.newPassword}
              onChange={handlePwField}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={pwFields.confirmPassword}
              onChange={handlePwField}
              fullWidth
            />
            {pwError && <Alert severity="error">{pwError}</Alert>}
            {pwSuccess && <Alert severity="success">{pwSuccess}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePwDialog} color="secondary" disabled={pwLoading}>Cancel</Button>
          <Button
            onClick={handleChangePassword}
            color="primary"
            variant="contained"
            disabled={pwLoading}
            startIcon={pwLoading ? <CircularProgress size={18} /> : <LockIcon />}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
