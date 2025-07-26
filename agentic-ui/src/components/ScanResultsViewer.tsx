// src/components/ScanResultsViewer.tsx
import * as React from "react";
import {
  Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary,
  AccordionDetails, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// 1. Define result types
export interface ScanField {
  name: string;
  types: string[];
  nullable?: boolean;
  primary_key?: boolean;
}

export interface ScanObject {
  name: string;
  fields: ScanField[];
}

export interface ScanResults {
  source_type: string;
  objects: ScanObject[];
}

interface ScanResultsViewerProps {
  open: boolean;
  onClose: () => void;
  results: ScanResults | null;
}

const typeColor = (type: string): "info" | "success" | "default" =>
  type.toLowerCase().includes("int") ? "info"
  : type.toLowerCase().includes("char") || type === "string" ? "success"
  : "default";

const ScanResultsViewer: React.FC<ScanResultsViewerProps> = ({ open, onClose, results }) => {
  if (!results) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Scan Results</DialogTitle>
      <DialogContent>
        {results.objects.map((obj) => (
          <Accordion key={obj.name}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 700 }}>{obj.name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Type(s)</TableCell>
                    <TableCell>Nullable</TableCell>
                    <TableCell>Primary Key</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {obj.fields.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>
                        {f.types.map((t) => (
                          <Chip key={t} size="small" color={typeColor(t)} label={t} sx={{ mr: 1 }} />
                        ))}
                      </TableCell>
                      <TableCell>
                        {f.nullable !== false
                          ? <Chip size="small" color="warning" label="YES" />
                          : <Chip size="small" color="primary" label="NO" />}
                      </TableCell>
                      <TableCell>
                        {f.primary_key
                          ? <Chip size="small" color="success" label="PK" />
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default ScanResultsViewer;
