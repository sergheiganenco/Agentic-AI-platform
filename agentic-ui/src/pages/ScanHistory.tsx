import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Pagination,
} from "@mui/material";
import type { ScanJob, ScanJobResult } from "../types/scans";
import ScanResultTable from "./ScanResultTable";
import { getArtifacts } from "../utils/scanHelpers";

const ROWS_PER_PAGE = 5;

const ScanHistory: React.FC = () => {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [result, setResult] = useState<ScanJobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [jobs]);

  const pagedJobs = jobs.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => {
    setLoading(true);
    fetch("/api/scan-jobs", {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") }
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load jobs");
        return r.json();
      })
      .then((data: ScanJob[]) => setJobs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const viewResult = (jobId: number) => {
    setLoading(true);
    fetch(`/api/scan-jobs/${jobId}/result`, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") }
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load result");
        return r.json();
      })
      .then((data: ScanJobResult) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  function getArtifactType(result: ScanJobResult): string {
    if (typeof result.metadata_json === "string") {
      if (result.metadata_json.includes("collections")) return "collections";
      if (result.metadata_json.includes("tables")) return "tables";
      if (result.metadata_json.includes("views")) return "views";
    }
    return "Result";
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        Scan History
      </Typography>
      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data Source</TableCell>
                <TableCell>DBs</TableCell>
                <TableCell>Artifacts</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.data_source_id}</TableCell>
                  <TableCell>
                    {job.db_names
                      ? Array.isArray(job.db_names)
                        ? job.db_names.join(", ")
                        : job.db_names
                      : ""}
                  </TableCell>
                  {/* Artifacts: Just show artifact types */}
                  <TableCell>
                    {job.artifact_types
                      ? Array.isArray(job.artifact_types)
                        ? job.artifact_types.join(", ")
                        : job.artifact_types
                      : ""}
                  </TableCell>
                  <TableCell>{job.created_at}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => viewResult(job.id)}
                    >
                      View Result
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box my={2} display="flex" justifyContent="center">
          <Pagination
            count={Math.ceil(jobs.length / ROWS_PER_PAGE)}
            page={page}
            onChange={(_, val) => setPage(val)}
            size="small"
            color="primary"
          />
        </Box>
      </Paper>

      {result && (
        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Scan Result (Job {result.scan_job_id})
          </Typography>
          <ScanResultTable
            artifacts={getArtifacts(result)}
            artifactType={getArtifactType(result)}
          />
          <Button
            sx={{ mt: 2 }}
            variant="outlined"
            onClick={() => setResult(null)}
          >
            Close
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default ScanHistory;
