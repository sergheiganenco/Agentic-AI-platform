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
  Button
} from "@mui/material";
import DataSourceSelect from "./DataSourceSelect";
import DatabaseSelect from "./DatabaseSelect";
import ArtifactSelect from "./ArtifactSelect";
import ScheduleSelect from "./ScheduleSelect";
import ConfirmScan from "./ConfirmScan";
import type { ScanConfig, DataSource } from "../../types/scans";
import { postScanJob } from "../../api/scans";
import { useNavigate } from "react-router-dom";

const steps = [
  "Select Data Source",
  "Select Databases",
  "Select Artifacts",
  "Schedule Scan",
  "Confirm & Submit"
];

const ScanWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [artifactSelections, setArtifactSelections] = useState<Record<string, string[]>>({});
  const [currentDbIndex, setCurrentDbIndex] = useState(0);
  const [schedule, setSchedule] = useState<{ time?: string; cron?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (
      !dataSource ||
      databases.length === 0 ||
      databases.some((db) => !artifactSelections[db] || artifactSelections[db].length === 0)
    ) {
      setError("All configuration steps must be completed and each database must have at least one artifact.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const config: ScanConfig = {
        dataSourceId: dataSource.id,
        dbNames: databases,
        artifactTypes: Object.values(artifactSelections).flat(),
        scheduledTime: schedule.time,
        scheduledCron: schedule.cron
      };
      const res = await postScanJob(config);
      setSubmittedJobId(res.jobId);
      handleNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit scan job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDatabasesChange = (selectedDbs: string[]) => {
    setDatabases(selectedDbs);
    setArtifactSelections((prev) => {
      const updated: Record<string, string[]> = {};
      selectedDbs.forEach((db) => {
        updated[db] = prev[db] || [];
      });
      return updated;
    });
    setCurrentDbIndex(0);
  };

  // Render steps
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <DataSourceSelect
            value={dataSource}
            onChange={ds => {
              setDataSource(ds);
              setDatabases([]);
              setArtifactSelections({});
              setCurrentDbIndex(0);
              handleNext();
            }}
          />
        );
      case 1:
        return dataSource && (
          <DatabaseSelect
            dataSourceId={dataSource.id}
            value={databases}
            onChange={handleDatabasesChange}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 2: {
        if (!dataSource || databases.length === 0) return null;
        const db = databases[currentDbIndex];
        const currentValue = artifactSelections[db] || [];
        const allDone = databases.every(
          db => artifactSelections[db] && artifactSelections[db].length > 0
        );

        return (
          <>
            <ArtifactSelect
              dataSource={dataSource}
              dbName={db}
              value={currentValue}
              onChange={arts => setArtifactSelections(s => ({ ...s, [db]: arts }))}
              onBack={() => {
                if (currentDbIndex === 0) handleBack();
                else setCurrentDbIndex(i => i - 1);
              }}
              onNext={() => {
                if (currentValue.length === 0) return;
                if (currentDbIndex < databases.length - 1) setCurrentDbIndex(i => i + 1);
                else handleNext();
              }}
              nextLabel={currentDbIndex < databases.length - 1 ? `Next: ${databases[currentDbIndex + 1]}` : "Continue"}
              showBack={true}
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
            onChange={sched => {
              setSchedule(sched);
              handleNext();
            }}
            onBack={handleBack}
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
              onClick={() => navigate("/dashboard/data-sources")}
            >
              Back to Data Sources
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
            background: "transparent"
          }}
        >
          {steps.map(label => (
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
      </Paper>
    </Box>
  );
};

export default ScanWizard;
