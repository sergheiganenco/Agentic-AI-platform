import React, { useEffect, useState } from "react";
import {
  Box, Typography, List, ListItemButton, ListItemText,
  CircularProgress, Alert, Checkbox, Stack, Button, Pagination
} from "@mui/material";
import { fetchArtifacts } from "../../api/scans";
import type { DataSource, Artifact, ArtifactApiResponse } from "../../types/scans";

const ARTIFACTS_PER_PAGE = 15;

// Always returns Artifact[] and uses both parameters.
function normalizeArtifacts(data: ArtifactApiResponse, sourceType: string): Artifact[] {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "name" in data[0]) {
      return data as Artifact[];
    }
    return (data as string[]).map((name) => ({ name, table: name }));
  }
  const result: Artifact[] = [];
  if (sourceType === "mongodb" || sourceType === "mongo") {
    const arr = (data as Record<string, unknown>)["collections"];
    if (Array.isArray(arr)) {
      if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && "name" in arr[0]) {
        result.push(...(arr as Artifact[]));
      } else if (arr.length > 0 && typeof arr[0] === "string") {
        result.push(...(arr as string[]).map((name) => ({ name, table: name })));
      }
    }
    return result;
  }
  ["tables", "views"].forEach((key) => {
    const arr = (data as Record<string, unknown>)[key];
    if (Array.isArray(arr)) {
      if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && "name" in arr[0]) {
        result.push(...(arr as Artifact[]));
      } else if (arr.length > 0 && typeof arr[0] === "string") {
        result.push(...(arr as string[]).map((name) => ({ name, table: name })));
      }
    }
  });
  const seen = new Set<string>();
  return result.filter((x) => {
    if (seen.has(x.name)) return false;
    seen.add(x.name);
    return true;
  });
}

interface ArtifactSelectProps {
  dataSource: DataSource;
  dbName: string;
  value: string[];
  onChange: (selected: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  showBack?: boolean;
}

const ArtifactSelect: React.FC<ArtifactSelectProps> = ({
  dataSource,
  dbName,
  value,
  onChange,
  onBack,
  onNext,
  nextLabel = "Next",
  showBack = true
}) => {
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!dataSource || !dbName) return;
    setLoading(true);
    setError(null);
    const type = (dataSource.type || "").toLowerCase();
    const artifactType = (type === "mongodb" || type === "mongo") ? "collections" : "tables";
    fetchArtifacts(dataSource, dbName, artifactType)
      .then((data: ArtifactApiResponse) => {
        setArtifactList(normalizeArtifacts(data, type));
        setPage(1); // reset pagination on data change
      })
      .catch(() => setError("Could not fetch artifacts"))
      .finally(() => setLoading(false));
  }, [dataSource, dbName]);

  // Pagination logic
  const totalPages = Math.ceil(artifactList.length / ARTIFACTS_PER_PAGE);
  const paginatedArtifacts = artifactList.slice(
    (page - 1) * ARTIFACTS_PER_PAGE,
    page * ARTIFACTS_PER_PAGE
  );

  if (loading)
    return (
      <Box textAlign="center" my={4}>
        <CircularProgress size={28} />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography mb={2} fontWeight={500}>
        Select artifacts to scan:
      </Typography>
      {artifactList.length === 0 ? (
        <Typography>No artifacts found for this schema/database.</Typography>
      ) : (
        <>
          <List>
            {paginatedArtifacts.map((art) => (
              <ListItemButton
                key={art.name}
                selected={value.includes(art.name)}
                onClick={() => {
                  if (value.includes(art.name)) {
                    onChange(value.filter((v) => v !== art.name));
                  } else {
                    onChange([...value, art.name]);
                  }
                }}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  border: value.includes(art.name)
                    ? "2px solid #6c2bd7"
                    : "1px solid #e0e0e0",
                  background: value.includes(art.name) ? "#f5f1ff" : "#fff",
                  "&:hover": { background: "#f3f0fa" },
                  transition: "all 0.15s",
                }}
              >
                <Checkbox
                  checked={value.includes(art.name)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ color: "#6c2bd7" }}
                />
                <ListItemText
                  primary={art.name}
                  secondary={art.row_count !== undefined ? `Rows: ${art.row_count}` : undefined}
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItemButton>
            ))}
          </List>
          <Box mt={2} display="flex" justifyContent="center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              color="primary"
            />
          </Box>
        </>
      )}
      <Stack direction="row" spacing={2} mt={2} alignItems="center" justifyContent="center">
        {showBack && (
          <Button variant="outlined" onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => onChange(artifactList.map((art) => art.name))}
          disabled={artifactList.length === 0}
        >
          Select All
        </Button>
        <Button
          variant="outlined"
          onClick={() => onChange([])}
          disabled={value.length === 0}
        >
          Clear Selection
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={value.length === 0}
        >
          {nextLabel}
        </Button>
      </Stack>
      <Box mt={2} color="#888" fontSize={14}>
        {value.length} selected of {artifactList.length}
      </Box>
    </Box>
  );
};

export default ArtifactSelect;
