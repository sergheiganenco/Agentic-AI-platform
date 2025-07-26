import React, { useState } from "react";
import { Box, Typography, Button, TextField, FormControlLabel, Checkbox } from "@mui/material";

interface Props {
  value: { time?: string; cron?: string };
  onChange: (v: { time?: string; cron?: string }) => void;
  onBack: () => void;
}

const ScheduleSelect: React.FC<Props> = ({ value, onChange, onBack }) => {
  const [runNow, setRunNow] = useState(value.time ? true : false);
  const [scheduledTime, setScheduledTime] = useState(value.time || "");
  const [cron, setCron] = useState(value.cron || "");

  const handleNext = () => {
    if (runNow) onChange({ time: new Date().toISOString() });
    else if (scheduledTime) onChange({ time: scheduledTime });
    else if (cron) onChange({ cron });
  };

  return (
    <Box>
      <Typography>Schedule your scan:</Typography>
      <Box mt={2}>
        <FormControlLabel
          control={<Checkbox checked={runNow} onChange={() => setRunNow(!runNow)} />}
          label="Run Now"
        />
      </Box>
      {!runNow && (
        <>
          <Box mt={2}>
            <TextField
              label="Schedule Time"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              fullWidth
            />
          </Box>
          <Box mt={2}>
            <TextField
              label="Or CRON Expression"
              placeholder="e.g., 0 2 * * *"
              value={cron}
              onChange={e => setCron(e.target.value)}
              fullWidth
            />
          </Box>
        </>
      )}
      <Box mt={2}>
        <Button onClick={onBack} variant="outlined" sx={{ mr: 2 }}>Back</Button>
        <Button onClick={handleNext} variant="contained">
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default ScheduleSelect;
