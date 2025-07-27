import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Button,
} from "@mui/material";
import DataSourceSelect from "./DataSourceSelect";
import DatabaseSelect from "./DatabaseSelect";
import ArtifactSelect from "./ArtifactSelect";
import ScheduleSelect from "./ScheduleSelect";
import ConfirmScan from "./ConfirmScan";
import type { ScanConfig, DataSource } from "../../types/scans";
import { postScanJob } from "../../api/scans";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "../common/ErrorBoundary";

const steps = [
  "Select Data Source",
  "Select Databases",
  "Select Artifacts",
  "Schedule Scan",
  "Confirm & Submit",
];

// Wizard state types
type ArtifactSelections = Record<string, string[]>; // { [dbName]: [artifact1, artifact2, ...] }
type ScheduleState = { time?: string; cron?: string };

const ScanWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [artifactSelections, setArtifactSelections] = useState<ArtifactSelections>({});
  const [currentDbIndex, setCurrentDbIndex] = useState<number>(0);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleCancel = () => {
    navigate("/dashboard/data-sources");
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));

  // Update database list and reset per-db artifacts
  const handleDatabasesChange = (selectedDbs: string[]) => {
    setDatabases(selectedDbs);
    setArtifactSelections((prev) => {
      const updated: ArtifactSelections = {};
      selectedDbs.forEach((db) => {
        updated[db] = prev[db] || [];
      });
      return updated;
    });
    setCurrentDbIndex(0);
  };

  // Final validation before submit
  const isValidForSubmit = (): boolean =>
    !!dataSource &&
    databases.length > 0 &&
    databases.every((db) => artifactSelections[db] && artifactSelections[db].length > 0);

  // Async submit
  const handleSubmit = async () => {
    if (!isValidForSubmit()) {
      setError("All configuration steps must be completed and each database must have at least one artifact.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const config: ScanConfig = {
        dataSourceId: dataSource!.id,
        dbNames: dataSource?.type === "sqlite" ? [] : databases,
        artifactTypes: dataSource?.type === "sqlite" ? ["tables"] : Object.values(artifactSelections).flat(),
        scheduledTime: schedule.time,
        scheduledCron: schedule.cron,
      };

      const res = await postScanJob(config);
      setSubmittedJobId(res.jobId);
      handleNext();
    } catch (err: unknown) {
      let msg = "Failed to submit scan job";
      if (err instanceof Error) msg = err.message;
      else if (typeof err === "object" && err && "detail" in err)
        msg = (err as { detail?: string }).detail ?? msg;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Step rendering
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <DataSourceSelect
            value={dataSource}
            onChange={(ds) => {
              setDataSource(ds);
              setDatabases([]);
              setArtifactSelections({});
              setCurrentDbIndex(0);
              handleNext();
            }}
            // helperText="Choose the data source you want to scan." // Add this prop to DataSourceSelect if desired
          />
        );
      case 1:
        return (
          dataSource && (
            <DatabaseSelect
              dataSourceId={dataSource.id}
              value={databases}
              onChange={handleDatabasesChange}
              onBack={handleBack}
              onNext={handleNext}
              // helperText="Select one or more databases from this source." // Add this prop to DatabaseSelect if desired
            />
          )
        );
      case 2: {
        if (!dataSource || databases.length === 0) return null;
        const db = databases[currentDbIndex];
        const currentValue = artifactSelections[db] || [];
        const allDone = databases.every((db) => artifactSelections[db] && artifactSelections[db].length > 0);
        return (
          <>
            <ArtifactSelect
              dataSource={dataSource}
              dbName={db}
              value={currentValue}
              onChange={(arts) => setArtifactSelections((s) => ({ ...s, [db]: arts }))}
              onBack={() => {
                if (currentDbIndex === 0) handleBack();
                else setCurrentDbIndex((i) => i - 1);
              }}
              onNext={() => {
                if (currentValue.length === 0) return;
                if (currentDbIndex < databases.length - 1) setCurrentDbIndex((i) => i + 1);
                else handleNext();
              }}
              nextLabel={currentDbIndex < databases.length - 1 ? `Next: ${databases[currentDbIndex + 1]}` : "Continue"}
              showBack={true}
              // helperText="Select the artifacts for each database." // Add this prop to ArtifactSelect if desired
            />
            <Box mt={2} color="error.main" fontSize={14} textAlign="center">
              {!allDone && "Please select at least one artifact in each database to continue."}
            </Box>
          </>
        );
      }
      case 3:
        return (
          <ScheduleSelect
            value={schedule}
            onChange={(sched) => {
              setSchedule(sched);
              handleNext();
            }}
            onBack={handleBack}
            // helperText="Optionally schedule the scan for a later time." // Add this prop to ScheduleSelect if desired
          />
        );
      case 4:
        return (
          <ConfirmScan
            dataSource={dataSource!}
            databases={databases}
            artifactTypes={Object.values(artifactSelections).flat()}
            artifactSelections={artifactSelections}
            schedule={schedule}
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        );
      case 5:
        return (
          <Box textAlign="center" mt={4}>
            <Typography variant="h6" color="success.main" gutterBottom>
              Scan job submitted!
            </Typography>
            <Typography>Job ID: {submittedJobId}</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3, minWidth: 200 }}
              onClick={() => navigate("/scan-history")}
            >
              Back to Scan History 
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "calc(100vh - 64px)",
        py: { xs: 1, md: 4 },
        px: { xs: 0.5, md: 2 },
        width: "100%",
        background: "#fafbfc",
      }}
    >
      <ErrorBoundary>
        <Paper
          elevation={4}
          sx={{
            width: "100%",
            maxWidth: 900,
            mx: "auto",
            mt: { xs: 2, md: 5 },
            p: { xs: 2, md: 4 },
            borderRadius: 4,
            boxShadow: "0 8px 32px rgba(44,24,94,0.08)",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            minHeight: 420,
            justifyContent: "flex-start",
          }}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            mb={3}
            align="center"
            sx={{ letterSpacing: 0.1 }}
          >
            Metadata Scan Wizard
          </Typography>
          <Stepper
            activeStep={activeStep}
            alternativeLabel={!isMobile}
            orientation={isMobile ? "vertical" : "horizontal"}
            sx={{
              mb: 3,
              fontSize: { xs: "1rem", md: "1.1rem" },
              background: "transparent",
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {submitting && (
            <Box textAlign="center" my={4}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 1 }}>Submitting scan job...</Typography>
            </Box>
          )}
          {!submitting && renderStep()}
          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button color="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </Box>
        </Paper>
      </ErrorBoundary>
    </Box>
  );
};

export default ScanWizard;
