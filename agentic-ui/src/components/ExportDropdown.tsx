import React, { useState } from "react";
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Download } from "lucide-react";

type ExportFormat = "csv" | "json";

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExport }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Download size={18} />}
        onClick={handleOpen}
        sx={{ minWidth: 130 }}
      >
        Export
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        <MenuItem onClick={() => { onExport("csv"); handleClose(); }}>
          <ListItemIcon><Download size={18} /></ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onExport("json"); handleClose(); }}>
          <ListItemIcon><Download size={18} /></ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportDropdown;
