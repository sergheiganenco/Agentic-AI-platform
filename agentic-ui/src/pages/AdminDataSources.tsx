// src/pages/AdminDataSources.tsx

import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PowerIcon from "@mui/icons-material/Power";
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import api from "../api/client";

// ---- Types ----
const STATIC_SOURCE_TYPES = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mssql", label: "SQL Server" },
  { value: "oracle", label: "Oracle" },
  { value: "snowflake", label: "Snowflake" },
  { value: "bigquery", label: "Google BigQuery" },
  { value: "mongodb", label: "MongoDB" },
  { value: "redshift", label: "Amazon Redshift" },
  { value: "sqlite", label: "SQLite" },
  { value: "other", label: "Other (custom)" },
];

type DataSourceStatus = "ok" | "error" | "unknown";
interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active?: boolean;
  connection_status?: DataSourceStatus;
}

interface ScanResult {
  tables?: string[];
  collections?: string[];
  columns?: Record<string, string[]>;
  [key: string]: unknown;
}

// ---- Helpers ----
const getTypeLabel = (type: string) =>
  STATIC_SOURCE_TYPES.find((t) => t.value === type)?.label || type;

const ConnectionStatusChip: React.FC<{ status?: DataSourceStatus }> = ({ status }) => {
  if (status === "ok")
    return (
      <Chip
        label="Connected"
        size="small"
        color="success"
        icon={<CheckCircleIcon fontSize="small" />}
        sx={{ ml: 1 }}
      />
    );
  if (status === "error")
    return (
      <Chip
        label="Failed"
        size="small"
        color="error"
        icon={<CancelIcon fontSize="small" />}
        sx={{ ml: 1 }}
      />
    );
  return (
    <Chip
      label="Unknown"
      size="small"
      color="default"
      icon={<HelpOutlineIcon fontSize="small" />}
      sx={{ ml: 1 }}
    />
  );
};

const renderScanResult = (result: ScanResult) => (
  <Box sx={{ mt: 2 }}>
    {result.tables && (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Tables:</Typography>
        <ul>
          {result.tables.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </>
    )}
    {result.collections && (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Collections:</Typography>
        <ul>
          {result.collections.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </>
    )}
    {result.columns &&
      Object.keys(result.columns).length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Columns:</Typography>
          <ul>
            {Object.entries(result.columns).map(([table, cols]) => (
              <li key={table}>
                <b>{table}</b>: {cols.join(", ")}
              </li>
            ))}
          </ul>
        </>
      )}
    {/* Display other keys if present */}
    {Object.entries(result).map(([key, value]) => {
      if (["tables", "collections", "columns"].includes(key)) return null;
      return (
        <Box key={key} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">{key}:</Typography>
          <pre style={{ margin: 0 }}>{JSON.stringify(value, null, 2)}</pre>
        </Box>
      );
    })}
  </Box>
);

// ---- Main Component ----

const AdminDataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [current, setCurrent] = useState<DataSource>({
    id: 0,
    name: "",
    type: "",
    connection_string: "",
    is_active: true,
  });
  const [customType, setCustomType] = useState<string>("");
  const [testLoadingId, setTestLoadingId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<number, DataSourceStatus>>({});
  const [scanLoadingId, setScanLoadingId] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState<boolean>(false);

  // Fetch Data Sources
  const fetchSources = () => {
    setLoading(true);
    api
      .get<DataSource[]>("/admin/data-sources")
      .then((res) => {
        setDataSources(res.data);
        const status: Record<number, DataSourceStatus> = {};
        res.data.forEach((ds) => {
          status[ds.id] = ds.connection_status || "unknown";
        });
        setConnectionStatus(status);
      })
      .catch(() => setError("Failed to load data sources."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // ---- Dialog Logic ----
  const handleOpenCreate = () => {
    setIsEdit(false);
    setCurrent({
      id: 0,
      name: "",
      type: "",
      connection_string: "",
      is_active: true,
    });
    setCustomType("");
    setOpenDialog(true);
  };

  const handleOpenEdit = (ds: DataSource) => {
    setIsEdit(true);
    setCurrent(ds);
    setCustomType(STATIC_SOURCE_TYPES.some((t) => t.value === ds.type) ? "" : ds.type);
    setOpenDialog(true);
  };

  const handleChange =
    (field: keyof DataSource) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCurrent((c) => ({ ...c, [field]: e.target.value }));
    };

  const handleTypeChange = (e: SelectChangeEvent<string>) => {
    const val = e.target.value;
    setCurrent((c) => ({ ...c, type: val }));
    if (val !== "other") setCustomType("");
  };

  const handleCustomType = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomType(e.target.value);
    setCurrent((c) => ({ ...c, type: e.target.value }));
  };

  const handleActiveChange = (_: unknown, checked: boolean) => {
    setCurrent((c) => ({ ...c, is_active: checked }));
  };

  const handleSave = () => {
    const payload = {
      name: current.name,
      type: current.type,
      connection_string: current.connection_string,
      is_active: current.is_active,
    };

    const request = isEdit
      ? api.patch(`/admin/data-sources/${current.id}`, payload)
      : api.post("/admin/data-sources", payload);

    request
      .then(() => {
        setSuccess(isEdit ? "Updated successfully" : "Created successfully");
        fetchSources();
        setOpenDialog(false);
      })
      .catch(() => setError("Save failed."));
  };

  const handleDelete = (id: number) => {
    api
      .delete(`/admin/data-sources/${id}`)
      .then(() => {
        setSuccess("Deleted successfully");
        fetchSources();
      })
      .catch(() => setError("Delete failed."));
  };

  const handleTest = (id: number) => {
    setTestLoadingId(id);
    api
      .post(`/admin/data-sources/${id}/test-connection`)
      .then(() => {
        setSuccess("Connection successful");
        setConnectionStatus((prev) => ({ ...prev, [id]: "ok" }));
      })
      .catch(() => {
        setError("Connection failed");
        setConnectionStatus((prev) => ({ ...prev, [id]: "error" }));
      })
      .finally(() => setTestLoadingId(null));
  };

  // ---- SCAN ----
  const handleScan = (id: number) => {
    setScanLoadingId(id);
    api
      .post(`/admin/data-sources/${id}/scan`)
      .then((res) => {
        setScanResult(res.data as ScanResult);
        setScanDialogOpen(true);
      })
      .catch(() => setError("Scan failed"))
      .finally(() => setScanLoadingId(null));
  };

  // ---- RENDER ----
  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Data Sources</Typography>
        <Button variant="contained" onClick={handleOpenCreate}>
          Add Source
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Connection String</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSources.map((ds) => (
            <TableRow key={ds.id}>
              <TableCell>{ds.name}</TableCell>
              <TableCell>{getTypeLabel(ds.type)}</TableCell>
              <TableCell>
                <Tooltip title={ds.connection_string}>
                  <span>
                    {ds.connection_string.length > 32
                      ? ds.connection_string.slice(0, 32) + "..."
                      : ds.connection_string}
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Switch checked={!!ds.is_active} disabled size="small" />
              </TableCell>
              <TableCell>
                <ConnectionStatusChip status={connectionStatus[ds.id]} />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit">
                  <IconButton onClick={() => handleOpenEdit(ds)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={() => handleDelete(ds.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Test Connection">
                  <span>
                    <IconButton
                      onClick={() => handleTest(ds.id)}
                      disabled={testLoadingId === ds.id}
                    >
                      {testLoadingId === ds.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PowerIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Scan Metadata">
                  <span>
                    <IconButton
                      onClick={() => handleScan(ds.id)}
                      disabled={scanLoadingId === ds.id}
                      color="info"
                    >
                      {scanLoadingId === ds.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PlayCircleFilledWhiteIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
        <DialogTitle>{isEdit ? "Edit" : "Create"} Data Source</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 1,
          }}
        >
          <TextField
            label="Name"
            value={current.name}
            onChange={handleChange("name")}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={
                STATIC_SOURCE_TYPES.some((t) => t.value === current.type)
                  ? current.type
                  : "other"
              }
              label="Type"
              onChange={handleTypeChange}
            >
              {STATIC_SOURCE_TYPES.map((option) => (
                <MenuItem value={option.value} key={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(current.type === "other" ||
            !STATIC_SOURCE_TYPES.some((t) => t.value === current.type)) && (
            <TextField
              label="Custom Type"
              value={customType}
              onChange={handleCustomType}
              fullWidth
            />
          )}
          <TextField
            label="Connection String"
            value={current.connection_string}
            onChange={handleChange("connection_string")}
            fullWidth
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!current.is_active}
                onChange={handleActiveChange}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan Results Dialog */}
      <Dialog
        open={scanDialogOpen}
        onClose={() => setScanDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Scan Results</DialogTitle>
        <DialogContent>
          {scanResult ? (
            renderScanResult(scanResult)
          ) : (
            <Typography>No scan data available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(undefined)}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(undefined)}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Paper>
  );
};

export default AdminDataSources;
