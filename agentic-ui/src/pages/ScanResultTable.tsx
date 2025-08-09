import React, { useMemo, useState } from "react";
import {
  Box, Paper, Typography, TextField, TableContainer, Table, TableHead,
  TableRow, TableCell, TableBody, TableSortLabel, Chip, Button, Tooltip,
  Checkbox, Menu, MenuItem, Pagination, FormControlLabel, Select
} from "@mui/material";
import type { SelectChangeEvent } from '@mui/material/Select';
import { KeyRound, ListFilter } from "lucide-react";
import { saveAs } from "file-saver";
import type { Artifact } from "../types/scans";
import { exportTableToPdf } from "../utils/pdfConfig";

// Column definitions
const allColumns: { key: keyof Artifact, label: string }[] = [
  { key: "table", label: "Table/Collection" },
  { key: "object_type", label: "Object Type" }, 
  { key: "name", label: "Column Name" },
  { key: "types", label: "Type(s)" },
  { key: "nullable", label: "Nullable" },
  { key: "primary_key", label: "PK" },
  { key: "row_count", label: "Row Count" },
  { key: "description", label: "Description" }
];

type ColumnKey = typeof allColumns[number]["key"];

function exportToCsv(data: Artifact[], columns: ColumnKey[], filename = "scan_result.csv") {
  const header = columns.map(col => String(col).toUpperCase()).join(",");
  const rows = data.map(row =>
    columns.map(col => JSON.stringify((row as Record<string, unknown>)[col] ?? "")).join(",")
  );
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  saveAs(blob, filename);
}

function exportToJson(data: Artifact[], columns: ColumnKey[], filename = "scan_result.json") {
  const filtered = data.map(row =>
    Object.fromEntries(columns.map(col => [col, (row as Record<string, unknown>)[col]]))
  );
  const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
  saveAs(blob, filename);
}

const ROWS_PER_PAGE_OPTIONS = [5, 15, 30, 50, 100];

const ScanResultTable: React.FC<{ artifacts: Artifact[]; artifactType: string }> = ({ artifacts, artifactType }) => {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [nullableOnly, setNullableOnly] = useState(false);
  const [pkOnly, setPkOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [exportType, setExportType] = useState("csv");

  const dynamicColumns = useMemo(() => {
    const keysPresent = new Set<ColumnKey>();
    for (const row of artifacts) {
      for (const col of allColumns) {
        if ((row as Record<string, unknown>)[col.key] !== undefined) {
          keysPresent.add(col.key);
        }
      }
    }
    const ordered = allColumns.filter(c => keysPresent.has(c.key));
    if (!ordered.some(c => c.key === "name")) ordered.unshift(allColumns.find(c => c.key === "name")!);
    if (artifacts.some(r => "table" in r)) ordered.unshift(allColumns.find(c => c.key === "table")!);
    return Array.from(new Set(ordered));
  }, [artifacts]);

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(dynamicColumns.map(col => col.key));
  React.useEffect(() => {
    setVisibleColumns(dynamicColumns.map(col => col.key));
  }, [artifacts, dynamicColumns]);

  const filtered = useMemo(
    () =>
      artifacts
        .filter(row => row.name?.toLowerCase().includes(search.toLowerCase()))
        .filter(row => (nullableOnly ? !!row.nullable : true))
        .filter(row => (pkOnly ? !!row.primary_key : true)),
    [artifacts, search, nullableOnly, pkOnly]
  );

  // Table sorting logic (honors current sort column and direction)

  const sorted = useMemo(() => {
  // Always sort by table and name, then by selected column if not table or name
  return [...filtered].sort((a, b) => {
    // Primary sort by table
    const tableCompare = String(a.table ?? "").localeCompare(String(b.table ?? ""), undefined, { sensitivity: "base" });
    if (tableCompare !== 0) return order === "asc" ? tableCompare : -tableCompare;

    // Secondary sort by column name
    const nameCompare = String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" });
    if (orderBy === "table" || orderBy === "name" || nameCompare !== 0) {
      return order === "asc" ? nameCompare : -nameCompare;
    }

    // Tertiary: custom sort column (if user selects another)
    const aValue = (a as Record<string, unknown>)[orderBy];
    const bValue = (b as Record<string, unknown>)[orderBy];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return order === "asc" ? aValue - bValue : bValue - aValue;
    }
    return String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, { sensitivity: "base" }) *
      (order === "asc" ? 1 : -1);
  });
}, [filtered, order, orderBy]);



  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  // Export handler
const handleExport = (): void => {
  if (exportType === "csv") {
    exportToCsv(sorted, visibleColumns);
  } else if (exportType === "json") {
    exportToJson(sorted, visibleColumns);
  } else if (exportType === "pdf") {
    // Build headers as array of strings
    const headers: string[] = visibleColumns.map(col => {
      const colDef = allColumns.find(c => c.key === col);
      return colDef?.label || String(col).toUpperCase();
    });


    // Build rows as array of arrays of strings
    const rows: string[][] = sorted.map(row =>
      visibleColumns.map(col => {
        const val = row[col as keyof Artifact];
        if (Array.isArray(val)) return val.join(", ");
        if (typeof val === "boolean") return val ? "Yes" : "No";
        return val !== undefined && val !== null ? String(val) : "";
      })
    );

    exportTableToPdf(rows, headers, "scan_result.pdf");
  }
};

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
        {/* Export dropdown + button */}
        <Select
          value={exportType}
          onChange={(e: SelectChangeEvent<string>) => setExportType(e.target.value)}
          size="small"
          sx={{ width: 110, mr: 1, bgcolor: "#fff" }}
        >
          <MenuItem value="csv">CSV</MenuItem>
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="json">JSON</MenuItem>
        </Select>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExport}
        >
          Export
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {dynamicColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                <TableCell key={String(col.key)}>
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
                    } else if (col.key === "object_type") {
                      cellContent = row.object_type
                        ? <Chip label={row.object_type} size="small" color="secondary" />
                        : "";
                    } else {
                      cellContent = row[col.key as keyof typeof row] ?? "";
                    }

                  return <TableCell key={String(col.key)}>{cellContent}</TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
