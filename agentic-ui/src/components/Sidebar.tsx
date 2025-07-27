import React, { useEffect } from "react";
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, IconButton, Divider, Tooltip
} from "@mui/material";
import { NavLink } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TableChartIcon from "@mui/icons-material/TableChart";
import PeopleIcon from "@mui/icons-material/People";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import HistoryIcon from "@mui/icons-material/History";

import { useAuth } from "../context/useAuth";

export const expandedWidth = 260;
export const collapsedWidth = 64;

interface SidebarProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const { user } = useAuth();

  // Only auto-collapse on small screens, but never auto-expand (allow manual toggle)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900 && open) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    
  }, [open, setOpen]);

  const navItems = [
    { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon />, roles: ["user", "admin"] },
    { label: "Data Sources", to: "/dashboard/data-sources", icon: <TableChartIcon />, roles: ["user", "admin"] },
    { label: "Metadata Scan Wizard", to: "/scan-wizard", icon: <SettingsEthernetIcon />, roles: ["user", "admin"] },
    { label: "Scan History", to: "/scan-history", icon: <HistoryIcon />, roles: ["user", "admin"] }, 
    { label: "User Management", to: "/admin/users", icon: <PeopleIcon />, roles: ["admin"] },
  ];

  if (!user || !user.role) return null;

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? expandedWidth : collapsedWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        [`& .MuiDrawer-paper`]: {
          width: open ? expandedWidth : collapsedWidth,
          transition: "width 0.3s",
          boxSizing: "border-box",
          top: "64px",
          left: 0,
          borderRight: "1px solid #eee",
          overflowX: "hidden",
          background: "#faf8ff",
          minHeight: "100vh",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
        },
      }}
      PaperProps={{ elevation: 2 }}
      aria-label="main navigation"
    >
      <Toolbar sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: open ? "flex-end" : "center",
        minHeight: "64px !important",
        px: 1,
      }}>
        <IconButton onClick={() => setOpen((o) => !o)} size="small" aria-label={open ? "Collapse sidebar" : "Expand sidebar"}>
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider sx={{ m: 0 }} />
      <List sx={{ p: 0, m: 0, width: "100%" }}>
        {navItems.filter(item => item.roles.includes(user.role ?? "")).map(item => (
          <Tooltip title={!open ? item.label : ""} placement="right" arrow key={item.to}>
            <ListItemButton
              component={NavLink}
              to={item.to}
              sx={{
                minHeight: 48,
                justifyContent: open ? "initial" : "center",
                px: 2.5,
                width: "100%",
                "&.active": {
                  background: "#e5e0fa",
                  color: "#6c2bd7",
                  fontWeight: 700,
                },
                transition: "all 0.2s",
              }}
              aria-label={item.label}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : "auto",
                  justifyContent: "center",
                  color: "#6c2bd7",
                  transition: "margin 0.2s",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
