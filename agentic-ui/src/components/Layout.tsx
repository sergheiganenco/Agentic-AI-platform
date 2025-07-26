// src/components/Layout.tsx
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  CircularProgress,
  Box,
  Chip
} from "@mui/material";
import { Link as RouterLink, useNavigate, Outlet } from "react-router-dom";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar, { expandedWidth, collapsedWidth } from "./Sidebar";
import { useAuth } from "../context/useAuth";

const Layout: React.FC = () => {
  const { isLoggedIn, user, logout, loadingUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleProfile = () => { navigate("/profile"); handleClose(); };
  const handleLogout = () => { logout(); navigate("/login"); handleClose(); };

  if (loadingUser) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100vw", background: "#f8f9fa" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          background: "#6c2bd7",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          height: 64,
        }}
      >
        <Toolbar>
          {isLoggedIn && user && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setSidebarOpen((o) => !o)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Agentic AI Platform
          </Typography>
          {isLoggedIn && user && (
            <>
              <Chip
                label={user.role === "admin" ? "Admin" : "User"}
                color={user.role === "admin" ? "secondary" : "default"}
                size="small"
                sx={{
                  mr: 2, fontWeight: 600, bgcolor: user.role === "admin" ? "#fff" : "#eee", color: "#6c2bd7",
                }}
              />
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {user.name
                  ? (<Avatar sx={{ bgcolor: "#fff", color: "#6c2bd7", fontWeight: 600 }}>{user.name[0].toUpperCase()}</Avatar>)
                  : (<AccountCircle fontSize="large" />)}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      {isLoggedIn && user && (
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            xs: "100vw",
            sm: `calc(100vw - ${sidebarOpen ? expandedWidth : collapsedWidth}px)`,
          },
          transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
          background: "#f8f9fa",
          minHeight: "100vh",
          mt: "64px", // AppBar height
          p: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
