import React, { useEffect, useState } from "react";
import type { ScanJob, ScanJobResult } from "../types/scans";
import ScanResultTable from "./ScanResultTable";
import { getArtifacts } from "../utils/scanHelpers";

export function ScanHistory() {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [result, setResult] = useState<ScanJobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const pagedJobs = jobs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

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
    <div style={{ padding: 24 }}>
      <h2>Scan History</h2>
      {loading && <div>CircularProgress</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Data Source</th>
            <th>DBs</th>
            <th>Artifacts</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedJobs.map((job) => (
            <tr key={job.id}>
              <td>{job.id}</td>
              <td>{job.status}</td>
              <td>{job.data_source_id}</td>
              <td>{job.db_names?.join(", ")}</td>
              <td>{job.artifact_types?.join(", ")}</td>
              <td>{job.created_at}</td>
              <td>
                <button onClick={() => viewResult(job.id)}>View Result</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination */}
      <div style={{ margin: "16px 0", textAlign: "center" }}>
        {Array.from({ length: Math.ceil(jobs.length / rowsPerPage) }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            style={{
              margin: "0 4px",
              padding: "4px 10px",
              background: i + 1 === page ? "#6549d5" : "#f2f2f2",
              color: i + 1 === page ? "#fff" : "#444",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {result && (
        <div style={{ marginTop: 32, border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
          <h3>Scan Result (Job {result.scan_job_id})</h3>
          <ScanResultTable
            artifacts={getArtifacts(result)}
            artifactType={getArtifactType(result)}
          />
          <button style={{ marginTop: 16 }} onClick={() => setResult(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
