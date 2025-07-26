import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, CircularProgress, Snackbar, Alert,
  IconButton, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import LockResetIcon from "@mui/icons-material/LockReset";
import api from "../api/client";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const roleOptions = ["admin", "user"] as const;
const statusOptions = ["active", "suspended"] as const;

const AdminUserList: React.FC = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<User>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "user", status: "active" });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resettingId, setResettingId] = useState<number | null>(null);

  // Extracted fetchUsers
  const fetchUsers = async (
    pageNum = page,
    rows = rowsPerPage,
    searchVal = debouncedSearch
  ) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/admin/users?skip=${pageNum * rows}&limit=${rows}&search=${encodeURIComponent(searchVal)}`
      );
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      setError("Failed to fetch users.");
    }
    setLoading(false);
  };

  // Fetch users (on page/search change)
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [page, rowsPerPage, debouncedSearch]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Handlers
  const handleEdit = (id: number) => {
    const user = users.find((u) => u.id === id);
    if (user) setEditing({ ...editing, [id]: { ...user } });
  };
  const handleFieldChange = (id: number, field: keyof User, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };
  const handleSave = async (id: number) => {
    const update = editing[id];
    try {
      await api.patch<User>(`/admin/users/${id}`, update);
      await fetchUsers(page, rowsPerPage, debouncedSearch); // update the table from backend!
      const next = { ...editing }; delete next[id]; setEditing(next);
      setSuccess("User updated!");
    } catch {
      setError("Failed to update user.");
    }
  };
  const handleCancel = (id: number) => {
    const next = { ...editing }; delete next[id]; setEditing(next);
  };
  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post<User>("/admin/users", createForm);
      setSuccess("User created!");
      setOpenCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "user", status: "active" });
      setPage(0);
      await fetchUsers(0, rowsPerPage, debouncedSearch); // refetch on first page
    } catch {
      setError("Failed to create user.");
    }
    setCreating(false);
  };
  const handleResetPassword = async (id: number) => {
    setResettingId(id);
    try {
      await api.post(`/admin/users/${id}/reset-password`);
      setSuccess("Reset password email sent.");
    } catch {
      setError("Failed to send reset.");
    }
    setResettingId(null);
  };
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(e.target.value)); setPage(0);
  };

  // UI
  if (loading) return <Box textAlign="center" mt={4}><CircularProgress /></Box>;

  return (
    <Paper sx={{ mt: 4, p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Admin User Management</Typography>
        <Box>
          <Button startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ mr: 2 }}>Create User</Button>
          <Button startIcon={<RefreshIcon />} onClick={() => fetchUsers(page, rowsPerPage, debouncedSearch)} />
        </Box>
      </Box>
      <Box mb={2}>
        <TextField
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ width: 280 }}
        />
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const isEditing = Boolean(editing[user.id]);
            return (
              <TableRow key={user.id}>
                <TableCell>
                  {isEditing ? (
                    <TextField
                      value={editing[user.id]?.name ?? ""}
                      onChange={e => handleFieldChange(user.id, "name", e.target.value)}
                      size="small"
                      sx={{ width: "90%" }}
                    />
                  ) : user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editing[user.id]?.role ?? ""}
                      onChange={e => handleFieldChange(user.id, "role", String(e.target.value))}
                      size="small"
                    >
                      {roleOptions.map((role) => (
                        <MenuItem value={role} key={role}>{role}</MenuItem>
                      ))}
                    </Select>
                  ) : user.role}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editing[user.id]?.status ?? ""}
                      onChange={e => handleFieldChange(user.id, "status", String(e.target.value))}
                      size="small"
                    >
                      {statusOptions.map((status) => (
                        <MenuItem value={status} key={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  ) : user.status}
                </TableCell>
                <TableCell align="right">
                  {isEditing ? (
                    <>
                      <IconButton color="success" onClick={() => handleSave(user.id)}><SaveIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleCancel(user.id)} sx={{ ml: 1 }}><CloseIcon /></IconButton>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={() => handleEdit(user.id)}><EditIcon /></IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <span>
                          <IconButton
                            color="warning"
                            disabled={resettingId === user.id}
                            onClick={() => handleResetPassword(user.id)}
                          >
                            <LockResetIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
      {/* Create User Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField label="Name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          <TextField label="Password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} type="password" />
          <Select
            label="Role"
            value={createForm.role}
            onChange={e => setCreateForm(f => ({ ...f, role: String(e.target.value) }))}
            sx={{ mt: 2 }}
          >
            {roleOptions.map(role => (
              <MenuItem value={role} key={role}>{role}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating}>Create</Button>
        </DialogActions>
      </Dialog>
      {/* Snackbars */}
      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError(undefined)}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess(undefined)}>
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Paper>
  );
};

export default AdminUserList;
