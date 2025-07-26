import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Chip,
  Button,
  Tooltip,
  Checkbox,
  Menu,
  MenuItem,
  Pagination,
  FormControlLabel
} from "@mui/material";
import { KeyRound, Download, ListFilter } from "lucide-react";
import { saveAs } from "file-saver";
import type { Artifact } from "../types/scans";

interface ScanResultTableProps {
  artifacts: Artifact[];
  artifactType: string;
}

// Column definitions
const allColumns: { key: keyof Artifact, label: string }[] = [
  { key: "table", label: "Table/Collection" },
  { key: "name", label: "Column Name" },
  { key: "types", label: "Type(s)" },
  { key: "nullable", label: "Nullable" },
  { key: "primary_key", label: "PK" },
  { key: "row_count", label: "Row Count" },
  { key: "description", label: "Description" }
];

type ColumnKey = typeof allColumns[number]["key"];

function exportToCsv(data: Artifact[], columns: ColumnKey[], filename = "scan_result.csv") {
  const header = columns.join(",");
  const rows = data.map(row =>
    columns.map(col => JSON.stringify((row as Record<string, unknown>)[col] ?? "")).join(",")
  );
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  saveAs(blob, filename);
}

const ROWS_PER_PAGE_OPTIONS = [5, 15, 30, 50, 100];

const ScanResultTable: React.FC<ScanResultTableProps> = ({ artifacts, artifactType }) => {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [nullableOnly, setNullableOnly] = useState(false);
  const [pkOnly, setPkOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Dynamic columns
  const dynamicColumns = useMemo(() => {
    const keysPresent = new Set<ColumnKey>();
    for (const row of artifacts) {
      for (const col of allColumns) {
        if ((row as Record<string, unknown>)[col.key] !== undefined) {
          keysPresent.add(col.key);
        }
      }
    }
    // Always show 'table' and 'name' first if present
    const ordered = allColumns.filter(c => keysPresent.has(c.key));
    if (!ordered.some(c => c.key === "name")) ordered.unshift(allColumns.find(c => c.key === "name")!);
    if (artifacts.some(r => "table" in r)) ordered.unshift(allColumns.find(c => c.key === "table")!);
    // Remove duplicates
    return Array.from(new Set(ordered));
  }, [artifacts]);

  // Column selector
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(dynamicColumns.map(col => col.key));
  React.useEffect(() => {
    setVisibleColumns(dynamicColumns.map(col => col.key));
  }, [artifacts]); // Reset on new data

  // Filtering and sorting
  const filtered = useMemo(
    () =>
      artifacts
        .filter(row => row.name?.toLowerCase().includes(search.toLowerCase()))
        .filter(row => (nullableOnly ? !!row.nullable : true))
        .filter(row => (pkOnly ? !!row.primary_key : true)),
    [artifacts, search, nullableOnly, pkOnly]
  );

  const sorted = useMemo(() => {
  return artifacts.slice().sort((a, b) => {
    const tableA = a.table?.toLowerCase() || "";
    const tableB = b.table?.toLowerCase() || "";
    if (tableA < tableB) return -1;
    if (tableA > tableB) return 1;
    return 0;
  });
}, [artifacts]);

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  // Export handler
  const handleExport = () => exportToCsv(sorted, visibleColumns);

  // Column select dialog
  const openMenu = Boolean(anchorEl);
  const handleOpenColumns = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleCloseColumns = () => setAnchorEl(null);
  const handleToggleColumn = (key: ColumnKey) => {
    setVisibleColumns(cols =>
      cols.includes(key) ? cols.filter(k => k !== key) : [...cols, key]
    );
  };

  // Row and column count for footer
  const totalRows = filtered.length;

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, boxShadow: "0 2px 24px #8867f220", mb: 4 }}>
      <Box display="flex" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Typography variant="h6" flex={1}>
          Scan Result: <span style={{ fontWeight: 700 }}>{artifactType}</span>
        </Typography>
        <TextField
          size="small"
          placeholder="Search column…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: 200 }}
        />
        <FormControlLabel
          control={
            <Checkbox checked={nullableOnly} onChange={e => setNullableOnly(e.target.checked)} size="small" />
          }
          label="Nullable only"
        />
        <FormControlLabel
          control={
            <Checkbox checked={pkOnly} onChange={e => setPkOnly(e.target.checked)} size="small" />
          }
          label="PK only"
        />
        <Button
          variant="outlined"
          startIcon={<ListFilter size={18} />}
          sx={{ minWidth: 110 }}
          onClick={handleOpenColumns}
        >
          Columns
        </Button>
        <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseColumns}>
          {dynamicColumns.map(col => (
            <MenuItem key={col.key} dense onClick={() => handleToggleColumn(col.key)}>
              <Checkbox checked={visibleColumns.includes(col.key)} size="small" />
              {col.label}
            </MenuItem>
          ))}
        </Menu>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download size={18} />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {dynamicColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                <TableCell key={col.key}>
                  <TableSortLabel
                    active={orderBy === col.key}
                    direction={orderBy === col.key ? order : "asc"}
                    onClick={() => {
                      if (orderBy === col.key) setOrder(order === "asc" ? "desc" : "asc");
                      else {
                        setOrderBy(col.key);
                        setOrder("asc");
                      }
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row, idx) => (
              <TableRow key={row.name || idx}>
                {dynamicColumns.filter(col => visibleColumns.includes(col.key)).map(col => {
                  let cellContent: React.ReactNode = "";

                  if (col.key === "name") {
                    // Add PK icon to name cell if row is PK
                    cellContent = (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {row.primary_key && (
                          <Tooltip title="Primary Key">
                            <KeyRound size={16} color="#ac6cff" />
                          </Tooltip>
                        )}
                        <Typography fontWeight={row.primary_key ? 700 : 500}>
                          {row.name ?? ""}
                        </Typography>
                      </Box>
                    );
                  } else if (col.key === "nullable" && row.nullable !== undefined) {
                    cellContent = (
                      <Chip
                        label={row.nullable ? "Yes" : "No"}
                        size="small"
                        color={row.nullable ? "success" : "warning"}
                      />
                    );
                  } else if (col.key === "primary_key" && row.primary_key !== undefined) {
                    cellContent = row.primary_key ? (
                      <Chip label="PK" size="small" color="primary" />
                    ) : "";
                  } else if (col.key === "types" && Array.isArray(row.types)) {
                    cellContent = row.types.map((t, i) => (
                      <Chip key={i} label={t as string} size="small" sx={{ mr: 0.5, mb: 0.25 }} />
                    ));
                  } else {
                    cellContent = row[col.key as keyof typeof row] ?? "";
                  }
                  return <TableCell key={col.key}>{cellContent}</TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Pagination and row summary */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center" color="#aaa">
        <Box>
          Showing {totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1}
          –
          {Math.min(page * rowsPerPage, totalRows)} of {totalRows} rows (on this page)
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            select
            label="Rows"
            value={rowsPerPage}
            onChange={e => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
            SelectProps={{ native: true }}
            size="small"
            sx={{ width: 80 }}
          >
            {ROWS_PER_PAGE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </TextField>
          <Pagination
            count={Math.ceil(totalRows / rowsPerPage)}
            page={page}
            onChange={(_, val) => setPage(val)}
            size="small"
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default ScanResultTable;
