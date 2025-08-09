import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { postAgenticQuery } from "../../api/agenticAiApi";
import type { AgenticAiQueryResponse } from "../../types/agenticAi";

interface Props {
  scanJobId: number;
}

const AgenticAIQueryBox: React.FC<Props> = ({ scanJobId }) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgenticAiQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postAgenticQuery({ query, scanJobId });
      setResult(data);
    } catch (err: unknown) {
      setError("Failed to query Agentic AI. Please try again.");
      setResult(null);
      console.error("Query error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyTable = (columns: string[], table: Record<string, unknown>[]) => {
    const csv = [
      columns.join(","),
      ...table.map((row) => columns.map((col) => String(row[col] ?? "")).join(",")),
    ].join("\n");
    navigator.clipboard.writeText(csv);
  };

  return (
    <Paper sx={{ p: 3, mb: 3, boxShadow: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Ask Agentic AI about this data</Typography>
        <TextField
          label="Type your question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          multiline
          minRows={2}
          maxRows={5}
          variant="outlined"
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleQuery}
          disabled={loading || !query.trim()}
        >
          {loading ? <CircularProgress size={24} /> : "Ask"}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}

        {result && (
          <Box>
            {/* Answer */}
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="subtitle1" flex={1}>
                Answer
              </Typography>
              <Tooltip title="Copy answer">
                <IconButton
                  size="small"
                  onClick={() => handleCopyText(result.answer)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ mb: 2, whiteSpace: "pre-line" }}>
              {result.answer}
            </Typography>

            {/* SQL (if present) */}
            {result.sql && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Typography variant="subtitle2" flex={1}>
                    Suggested SQL
                  </Typography>
                  <Tooltip title="Copy SQL">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyText(result.sql!)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box
                  sx={{
                    bgcolor: "#f7f7fa",
                    fontFamily: "monospace",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: "0.95rem",
                    wordBreak: "break-all",
                  }}
                >
                  {result.sql}
                </Box>
              </Box>
            )}

            {/* Table (if present) */}
            {result.table && result.columns && result.table.length > 0 && result.columns.length > 0 && (
              <Box sx={{ overflowX: "auto", mb: 2 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" flex={1}>
                    Table Results
                  </Typography>
                  <Tooltip title="Copy table as CSV">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyTable(result.columns!, result.table!)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {result.columns.map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.table.map((row, idx) => (
                      <TableRow key={idx}>
                        {result.columns!.map((col) => (
                          <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default AgenticAIQueryBox;
