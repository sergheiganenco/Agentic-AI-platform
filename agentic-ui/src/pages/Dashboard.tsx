// src/pages/Dashboard.tsx
import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import api from "../api/client";

interface DataSource {
  id: number;
  name: string;
  connection_status?: "ok" | "error" | "unknown" | "connected";
}

type ScanResult =
  | { type: "sql"; tables: { table: string; columns: { name: string; type: string }[] }[] }
  | { type: "mongo"; collections: { collection: string; fields: { name: string; type: string }[] }[] }
  | { type: "unsupported"; raw: unknown };

interface ScanResultsDialogProps {
  open: boolean;
  onClose: () => void;
  result: ScanResult | null;
  loading: boolean;
}

const ScanResultsDialog: React.FC<ScanResultsDialogProps> = ({
  open,
  onClose,
  result,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Scan Results</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {!loading && result && (
          <Box sx={{ mt: 2 }}>
            {result.type === "sql" && (
              <Box>
                {result.tables.map((tbl) => (
                  <Box key={tbl.table} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">{tbl.table}</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column</TableCell>
                          <TableCell>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tbl.columns.map((col) => (
                          <TableRow key={col.name}>
                            <TableCell>{col.name}</TableCell>
                            <TableCell>{col.type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Box>
            )}
            {result.type === "mongo" && (
              <Box>
                {result.collections.map((coll) => (
                  <Box key={coll.collection} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">{coll.collection}</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {coll.fields.map((field) => (
                          <TableRow key={field.name}>
                            <TableCell>{field.name}</TableCell>
                            <TableCell>{field.type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Box>
            )}
            {result.type === "unsupported" && (
              <pre>{JSON.stringify(result.raw, null, 2)}</pre>
            )}
          </Box>
        )}
        {!loading && !result && <Typography>No scan data found.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// StatCard remains the same
const StatCard: React.FC<{ title: string; value: string | number }> = ({
  title,
  value,
}) => (
  <Paper
    elevation={3}
    sx={{
      p: 2,
      minWidth: 160,
      flex: "1 1 160px",
      textAlign: "center",
    }}
  >
    <Typography variant="h6" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Paper>
);

const Dashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Scan dialog and results
  const [scanDialogOpen, setScanDialogOpen] = React.useState(false);
  const [dataSources, setDataSources] = React.useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState<number | "">("");
  const [scanning, setScanning] = React.useState(false);

  // Scan result state
  const [scanResultsOpen, setScanResultsOpen] = React.useState(false);
  const [scanResults, setScanResults] = React.useState<ScanResult | null>(null);
  const [scanResultsLoading, setScanResultsLoading] = React.useState(false);

  // Fetch only connected sources for scan dialog
  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const res = await api.get<DataSource[]>("/admin/data-sources");
      setDataSources(
        res.data.filter(
          (ds) =>
            String(ds.connection_status).toLowerCase() === "ok" ||
            String(ds.connection_status).toLowerCase() === "connected"
        )
      );
    } catch {
      setError("Failed to load data sources.");
    } finally {
      setLoading(false);
    }
  };

  // Open scan dialog & reset selection
  const handleOpenScanDialog = () => {
    fetchDataSources();
    setSelectedSource("");
    setScanDialogOpen(true);
  };

  // Scan with viewer
  const handleStartScan = async () => {
    if (!selectedSource) {
      setError("Please select a data source to scan.");
      return;
    }
    setScanning(true);
    setScanResultsLoading(true);
    setScanResults(null);
    try {
      // Immediately fetch scan results after scan
      const res = await api.post(`/admin/data-sources/${selectedSource}/scan`);
      // Parse result for elegant view (backend must return proper types and info)
      if ("tables" in res.data) {
        setScanResults({ type: "sql", tables: res.data.tables });
      } else if ("collections" in res.data) {
        setScanResults({ type: "mongo", collections: res.data.collections });
      } else {
        setScanResults({ type: "unsupported", raw: res.data });
      }
      setSuccess("Scan complete!");
      setScanResultsOpen(true);
      setScanDialogOpen(false);
    } catch {
      setError("Failed to scan data source.");
    } finally {
      setScanning(false);
      setScanResultsLoading(false);
    }
  };

  // Example stats (replace with real data)
  const stats = [
    { title: "Total Users", value: 104 },
    { title: "Data Sources", value: 7 },
    { title: "Active Scans", value: 2 },
    { title: "PII Alerts", value: 1 },
  ];

  // Example recent activity (replace with real API integration)
  const recentActivity = [
    { text: <>Data scan started on <b>Azure SQL</b> (2 minutes ago)</> },
    { text: <>New user <b>Alex Smith</b> invited (1 hour ago)</> },
    { text: <>Scan completed for <b>Postgres DB</b> (yesterday)</> },
  ];

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, width: "100%", p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Welcome, Admin!
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Stats Row */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 2,
        }}
      >
        {stats.map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} />
        ))}
      </Box>

      {/* Recent Activity */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Recent Activity
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {recentActivity.map((item, idx) => (
            <li key={idx}>{item.text}</li>
          ))}
        </ul>
      </Paper>

      {/* Quick Actions */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Quick Actions
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2 }}
          onClick={() => window.location.assign("/admin/data-sources")}
        >
          Add Data Source
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          sx={{ mr: 2 }}
          onClick={handleOpenScanDialog}
        >
          Start Data Source Scan
        </Button>
        <Button
          variant="outlined"
          color="success"
          onClick={() => window.location.assign("/admin/users")}
        >
          Invite User
        </Button>
      </Paper>

      {/* Scan Data Source Dialog */}
      <Dialog
        open={scanDialogOpen}
        onClose={() => setScanDialogOpen(false)}
        fullWidth
      >
        <DialogTitle>Start Data Source Scan</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel id="scan-source-label">Select Data Source</InputLabel>
            <Select<number | "">
              labelId="scan-source-label"
              value={selectedSource}
              label="Select Data Source"
              onChange={(event: SelectChangeEvent<number | "">) =>
                setSelectedSource(
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              renderValue={(val) => {
                if (!val) return <em>Select...</em>;
                const found = dataSources.find((ds) => ds.id === val);
                return found ? found.name : val;
              }}
            >
              {dataSources.length === 0 ? (
                <MenuItem value="">
                  <em>No connected data sources found</em>
                </MenuItem>
              ) : (
                dataSources.map((ds) => (
                  <MenuItem value={ds.id} key={ds.id}>
                    {ds.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)} disabled={scanning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartScan}
            disabled={scanning || !selectedSource}
          >
            {scanning ? <CircularProgress size={20} /> : "Start Scan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Elegant Scan Results Dialog */}
      <ScanResultsDialog
        open={scanResultsOpen}
        onClose={() => setScanResultsOpen(false)}
        result={scanResults}
        loading={scanResultsLoading}
      />

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
