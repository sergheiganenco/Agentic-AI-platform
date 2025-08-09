// src/components/AiAssistantPanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  CircularProgress, Divider, Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { z } from "zod";

// ---- Types shared with backend contracts ----
const RagSourceRefSchema = z.object({
  id: z.number(),
  object_type: z.string(),
  object_id: z.string(),
  title: z.string().optional(),
});

const RagQueryResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(RagSourceRefSchema),
});

const AiAskResponseSchema = z.object({
  answer: z.string(),
  context_summary: z.string().nullable().optional(),
});

type RagSourceRef = z.infer<typeof RagSourceRefSchema>;
type RagQueryResponse = z.infer<typeof RagQueryResponseSchema>;
type AiAskResponse = z.infer<typeof AiAskResponseSchema>;

type AiAskRequest = {
  scan_id?: string;
  scope_tables?: string[];
  question: string;
  row_limit?: number;
};

type RagQueryRequest = {
  question: string;
  tenant_id?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  scanId?: string;
  selectedTables?: string[];
  ragFirst?: boolean; // defaults to true
  baseUrl?: string;   // optional, e.g. "http://localhost:8000"
};

// ---- Small HTTP helpers (no `any`) ----
async function postJSON<T>(
  url: string,
  body: unknown,
  parse: (data: unknown) => T,
  signal?: AbortSignal
): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${text || resp.statusText}`);
  }
  const data: unknown = await resp.json().catch(() => ({}));
  return parse(data);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// ---- Component ----
const AiAssistantPanel: React.FC<Props> = ({
  open,
  onClose,
  scanId,
  selectedTables,
  ragFirst = true,
  baseUrl = "",
}) => {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<RagSourceRef[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  // Build URLs once
  const urls = useMemo(() => {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return {
      ragQuery: `${trimmed}/ai/rag/query`,
      aiAsk: `${trimmed}/agentic-ai/ask`,
    };
  }, [baseUrl]);

  const resetState = useCallback((): void => {
    setAnswer("");
    setSources([]);
  }, []);

  const doAsk = useCallback(async (): Promise<void> => {
    const q = question.trim();
    if (!q) return;

    // cancel any in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    resetState();

    try {
      if (ragFirst) {
        const ragReq: RagQueryRequest = { question: q };
        const ragResp = await postJSON<RagQueryResponse>(
          urls.ragQuery,
          ragReq,
          (d) => RagQueryResponseSchema.parse(d),
          ac.signal
        );

        if (ragResp.answer.trim().length > 0) {
          setAnswer(ragResp.answer);
          setSources(ragResp.sources);
          return;
        }
      }

      // Fallback to scan-context ask
      const askReq: AiAskRequest = {
        scan_id: scanId,
        scope_tables: selectedTables && selectedTables.length > 0 ? selectedTables : undefined,
        question: q,
      };

      const askResp = await postJSON<AiAskResponse>(
        urls.aiAsk,
        askReq,
        (d) => AiAskResponseSchema.parse(d),
        ac.signal
      );

      setAnswer(askResp.answer);
    } catch (err) {
      // Swallow abort errors silently
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAnswer(`⚠️ ${errorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, [question, ragFirst, urls.ragQuery, urls.aiAsk, scanId, selectedTables, resetState]);

  // Submit on Ctrl/Cmd+Enter
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void doAsk();
      }
    },
    [doAsk]
  );

  // Cleanup on unmount/close
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 560, p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">AI Assistant</Typography>
          <IconButton onClick={onClose} aria-label="Close AI Assistant"><CloseIcon /></IconButton>
        </Box>

        <TextField
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about PII, policies, data quality, anomalies…"
          multiline
          minRows={2}
          inputProps={{ maxLength: 1000, "aria-label": "AI question input" }}
        />

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={() => { void doAsk(); }}
            disabled={loading || question.trim().length === 0}
          >
            Ask
          </Button>
          {loading && <CircularProgress size={22} aria-label="Loading" />}
        </Box>

        <Divider />

        {sources.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Sources</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {sources.map((s) => (
                <Chip
                  key={s.id}
                  label={`[${s.id}] ${s.title ?? s.object_id}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ whiteSpace: "pre-wrap", fontFamily: "Inter, system-ui, sans-serif" }}>
          {answer}
        </Box>
      </Box>
    </Drawer>
  );
};

export default AiAssistantPanel;
