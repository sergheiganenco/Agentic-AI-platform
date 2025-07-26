import React, { useEffect, useState } from "react";
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress } from "@mui/material";
import api from "../api/client";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<User[]>("/users").then(res => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box textAlign="center" mt={4}><CircularProgress /></Box>;

  return (
    <Paper sx={{ mt: 4, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>All Users</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default UsersList;
