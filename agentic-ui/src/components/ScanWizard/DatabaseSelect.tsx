import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  Checkbox,
  Stack
} from "@mui/material";
import { fetchDatabases } from "../../api/scans";
import type { Database } from "../../types/scans";
import { useAuth } from "../../context/useAuth"; // Adjust path as needed

const SYSTEM_SCHEMAS = [
  "INFORMATION_SCHEMA", "sys", "guest", "db_owner", "db_accessadmin",
  "db_backupoperator", "db_datareader", "db_datawriter", "db_ddladmin",
  "db_denydatareader", "db_denydatawriter", "db_securityadmin"
];

interface DatabaseSelectProps {
  dataSourceId: number;
  value: string[]; // Selected schemas
  onChange: (dbs: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const DatabaseSelect: React.FC<DatabaseSelectProps> = ({
  dataSourceId, value, onChange, onBack, onNext
}) => {
  const { user } = useAuth();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDatabases(dataSourceId)
      .then(setDatabases)
      .catch(() => setError("Could not fetch schemas"))
      .finally(() => setLoading(false));
  }, [dataSourceId]);

  // Filter schemas for regular users, show all for admins
  const isAdmin = user?.role === "admin";
  const displaySchemas = isAdmin
    ? databases
    : databases.filter(db => !SYSTEM_SCHEMAS.includes(db.name));

  // Toggle one schema
  const toggleDb = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(db => db !== name));
    } else {
      onChange([...value, name]);
    }
  };

  // Select all visible schemas
  const handleSelectAll = () => {
    onChange(displaySchemas.map(db => db.name));
  };

  // Clear selection
  const handleClear = () => {
    onChange([]);
  };

  // Handle Next: Only proceed if something is selected
  const handleNextClick = () => {
    if (value.length > 0) onNext();
  };

  if (loading)
    return <Box textAlign="center" my={4}><CircularProgress size={28} /></Box>;
  if (error)
    return <Alert severity="error">{error}</Alert>;
  if (!databases.length)
    return <Typography>No schemas found for this data source.</Typography>;

  return (
    <Box>
      <Typography mb={2} fontWeight={500}>
        Select Schema{isAdmin ? " (admin: all shown)" : ""}:
      </Typography>
      <List>
        {displaySchemas.map(db => (
          <ListItemButton
            key={db.name}
            selected={value.includes(db.name)}
            onClick={() => toggleDb(db.name)}
            sx={{
              mb: 1, borderRadius: 2,
              border: value.includes(db.name) ? "2px solid #6c2bd7" : "1px solid #e0e0e0",
              background: value.includes(db.name) ? "#f5f1ff" : "#fff",
              "&:hover": { background: "#f3f0fa" }
            }}
          >
            <Checkbox
              edge="start"
              checked={value.includes(db.name)}
              tabIndex={-1}
              disableRipple
              sx={{ mr: 2 }}
            />
            <ListItemText
              primary={db.name}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
          </ListItemButton>
        ))}
      </List>
      <Stack direction="row" spacing={2} mt={3}>
        <Button variant="outlined" onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={handleSelectAll}
          disabled={displaySchemas.length === 0}
        >
          Select All
        </Button>
        <Button
          variant="outlined"
          onClick={handleClear}
          disabled={value.length === 0}
        >
          Clear Selection
        </Button>
        <Button
          variant="contained"
          onClick={handleNextClick}
          disabled={value.length === 0}
        >
          Next
        </Button>
      </Stack>
      {isAdmin && (
        <Alert severity="info" sx={{ mt: 2 }}>
          You are seeing system/internal schemas because you are an admin.
        </Alert>
      )}
    </Box>
  );
};

export default DatabaseSelect;
