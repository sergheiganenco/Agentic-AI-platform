import React from "react";
import type { DataSource } from "../../types/scans";
import { Box, Typography, List, ListItem, ListItemText, Button, CircularProgress, Alert } from "@mui/material";

interface Props {
  dataSource: DataSource;
  databases: string[];
  artifactTypes: string[]; // If using flat array
  // OR
  artifactSelections?: Record<string, string[]>; // if you want to show per-db
  schedule: { time?: string; cron?: string };
  onBack: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}

const ConfirmScan: React.FC<Props> = ({
  dataSource,
  databases,
  artifactTypes,
  schedule,
  onBack,
  onSubmit,
  submitting,
  error,
}) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Confirm Scan Configuration
    </Typography>
    <List>
      <ListItem>
        <ListItemText primary="Server" secondary={dataSource.name} />
      </ListItem>
      <ListItem>
        <ListItemText primary="Databases" secondary={databases.join(", ")} />
      </ListItem>
      <ListItem>
        <ListItemText primary="Artifacts" secondary={artifactTypes.join(", ")} />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Schedule"
          secondary={
            schedule.time
              ? `Run at ${new Date(schedule.time).toLocaleString()}`
              : schedule.cron
              ? `CRON: ${schedule.cron}`
              : "Run Now"
          }
        />
      </ListItem>
    </List>
    {error && <Alert severity="error">{error}</Alert>}
    <Box mt={2}>
      <Button onClick={onBack} variant="outlined" sx={{ mr: 2 }} disabled={submitting}>
        Back
      </Button>
      <Button onClick={onSubmit} variant="contained" disabled={submitting}>
        {submitting ? <CircularProgress size={24} /> : "Submit Scan"}
      </Button>
    </Box>
  </Box>
);

export default ConfirmScan;
