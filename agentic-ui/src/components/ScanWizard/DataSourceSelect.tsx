// src/components/ScanWizard/DataSourceSelect.tsx

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Button,
  Alert,
} from "@mui/material";
import { fetchDataSources } from "../../api/scans";
import type { DataSource } from "../../types/scans";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

interface DataSourceSelectProps {
  value: DataSource | null;
  onChange: (ds: DataSource) => void;
}

const DataSourceSelect: React.FC<DataSourceSelectProps> = ({ value, onChange }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
  setLoading(true);
  fetchDataSources()
    .then((data) => {
      console.log("Fetched data sources:", data);
      setDataSources(data);
    })
    .catch((err) => {
      console.error("Failed to fetch data sources", err);
      setError("Could not fetch data sources");
    })
    .finally(() => setLoading(false));
}, []);

  if (loading) {
    return (
      <Box textAlign="center" my={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  if (!dataSources.length) {
    return (
      <Box textAlign="center">
        <Typography mb={2}>
          No data sources found.
        </Typography>
        {user?.role === "admin" ? (
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate("/dashboard/data-sources")}
          >
            Add Data Source
          </Button>
        ) : (
          <Typography variant="body2" sx={{ mt: 2 }}>
            Please contact your administrator to add a data source.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography mb={2} fontWeight={500}>
        Select a Data Source to scan:
      </Typography>
      <List>
        {dataSources.map((ds) => (
          <ListItemButton
            key={ds.id}
            selected={value?.id === ds.id}
            onClick={() => onChange(ds)}
            sx={{
              mb: 1,
              borderRadius: 2,
              border: value?.id === ds.id ? "2px solid #6c2bd7" : "1px solid #e0e0e0",
              background: value?.id === ds.id ? "#f5f1ff" : "#fff",
              "&:hover": { background: "#f3f0fa" },
              transition: "all 0.15s",
            }}
          >
            <ListItemText
              primary={ds.name}
              secondary={ds.type}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default DataSourceSelect;
