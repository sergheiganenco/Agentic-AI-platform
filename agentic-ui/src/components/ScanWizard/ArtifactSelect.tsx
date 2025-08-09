import React, { useEffect, useState } from "react";
import {
  Box, Typography, List, ListItemButton, ListItemText,
  CircularProgress, Alert, Checkbox, Stack, Button, Pagination
} from "@mui/material";
import { fetchArtifacts } from "../../api/scans";
import type { DataSource, Artifact } from "../../types/scans";
import { normalizeArtifacts } from "../../utils/normalizeArtifacts";

const ARTIFACTS_PER_PAGE = 15;

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

    const fetchAll = async () => {
      if (type === "mongodb" || type === "mongo") {
        const artifacts = await fetchArtifacts(dataSource, dbName, "collections");
        setArtifactList(normalizeArtifacts(artifacts, type));
      } else {
        const sqlTypes = ["tables", "views", "procedures", "functions"];
        const results = await Promise.all(
          sqlTypes.map((t) => fetchArtifacts(dataSource, dbName, t))
        );
        // Flatten, normalize and merge all
        const merged = results.flatMap((artifacts, idx) =>
          normalizeArtifacts(artifacts, sqlTypes[idx])
        );
        // Remove duplicates by name + type
        const seen = new Set<string>();
        const unique = merged.filter((art) => {
          const key = art.name + "_" + (art.object_type || "");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setArtifactList(unique);
      }
      setPage(1);
      setLoading(false);
    };

    fetchAll().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Artifact fetch error", err);
      setError("Could not fetch artifacts");
      setLoading(false);
    });
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
                key={art.name + (art.object_type ?? "")}
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
                  secondary={
                    (art.object_type
                      ? `Type: ${art.object_type.charAt(0).toUpperCase() + art.object_type.slice(1)}`
                      : "Type: Table") +
                    (art.row_count !== undefined ? ` | Rows: ${art.row_count}` : "")
                  }
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
