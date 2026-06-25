"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import useSWR from "swr";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import { CRITICALITY_COLOR, SEVERITY_COLOR, STATUS_COLOR } from "@/lib/theme";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimulationSocket } from "@/hooks/useSimulationSocket";
import type { Service, SimulationResult } from "@/types";

export default function SimulationPage() {
  useSimulationSocket();

  const { data: services } = useSWR<Service[]>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/services`,
    fetcher,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [snack, setSnack] = useState<{ msg: string; severity: "error" | "success" } | null>(null);

  const { isRunning, liveImpacts, finalResult, failedServices, reset } = useSimulationStore();

  useEffect(() => {
    if (finalResult && result) {
      setRunning(false);
    }
  }, [finalResult, result]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function run() {
    if (selected.size === 0) {
      setSnack({ msg: "Select at least one service to fail", severity: "error" });
      return;
    }
    reset();
    setResult(null);
    setRunning(true);
    try {
      const r = await api.runSimulation(Array.from(selected), name || undefined);
      setResult(r);
    } catch (e: any) {
      setSnack({ msg: e.message || "Simulation failed", severity: "error" });
      setRunning(false);
    }
  }

  function runAgain() {
    reset();
    setResult(null);
    setRunning(false);
  }

  function clearAll() {
    setSelected(new Set());
    setName("");
  }

  const sortedImpacts = Array.from(liveImpacts.values()).sort(
    (a, b) => a.depth - b.depth || a.serviceName.localeCompare(b.serviceName),
  );

  const sortedServices = [...(services ?? [])].sort((a, b) => {
    const critOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return critOrder[a.criticality] - critOrder[b.criticality];
  });

  return (
    <>
      <TopBar title="Failure Simulation" subtitle="Simulate outages and observe cascading blast radius" />
      <Box sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {/* ── Left: service selector ─────────────────────────────── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Select Services to Fail</Typography>
                  {selected.size > 0 && (
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={clearAll} sx={{ color: "#94a3b8" }}>
                      Clear ({selected.size})
                    </Button>
                  )}
                </Stack>

                <TextField
                  label="Simulation name (optional)"
                  size="small"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auth outage drill"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ maxHeight: 420, overflow: "auto", pr: 0.5 }}>
                  <Stack spacing={1}>
                    {sortedServices.map((s) => {
                      const isSelected = selected.has(s.id);
                      const color = CRITICALITY_COLOR[s.criticality];
                      return (
                        <Paper
                          key={s.id}
                          variant="outlined"
                          onClick={() => toggle(s.id)}
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            border: isSelected ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.06)",
                            backgroundColor: isSelected ? `${color}0d` : "transparent",
                            boxShadow: isSelected ? `0 0 16px ${color}22` : "none",
                            transition: "all 0.18s ease",
                            "&:hover": {
                              borderColor: color,
                              backgroundColor: `${color}08`,
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: 1,
                                border: `2px solid`,
                                borderColor: isSelected ? color : "rgba(255,255,255,0.15)",
                                backgroundColor: isSelected ? color : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.18s",
                              }}
                            >
                              {isSelected && <CheckIcon sx={{ fontSize: 12, color: "white" }} />}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#475569" }}>
                                {s.owner}
                              </Typography>
                            </Box>
                            <Chip
                              label={s.criticality}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                backgroundColor: `${color}18`,
                                color,
                                fontWeight: 700,
                                "& .MuiChip-label": { px: 0.75 },
                              }}
                            />
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  size="large"
                  startIcon={running ? <CircularProgress size={18} color="inherit" /> : <BoltIcon />}
                  onClick={run}
                  disabled={running || selected.size === 0}
                  sx={{ py: 1.5 }}
                >
                  {running
                    ? "Simulating cascade…"
                    : `Simulate ${selected.size > 0 ? selected.size : ""} Failure${selected.size === 1 ? "" : "s"}`}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Right: impact panel ────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ minHeight: 600 }}>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Impact Analysis</Typography>
                  <Stack direction="row" spacing={1}>
                    {isRunning && (
                      <Chip
                        icon={<CircularProgress size={12} sx={{ color: "#fbbf24 !important" }} />}
                        label="Propagating"
                        size="small"
                        sx={{
                          backgroundColor: "rgba(245,158,11,0.15)",
                          color: "#fbbf24",
                          border: "1px solid rgba(245,158,11,0.3)",
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {!isRunning && finalResult && (
                      <Button size="small" startIcon={<RestartAltIcon />} onClick={runAgain} sx={{ color: "#94a3b8" }}>
                        Run Again
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {/* Empty state */}
                {!running && !result && (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 8,
                      background: "linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 100%)",
                      borderRadius: 3,
                    }}
                  >
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        backgroundColor: "rgba(99,102,241,0.08)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2.5,
                      }}
                    >
                      <BoltIcon sx={{ fontSize: 36, color: "#6366f1" }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "#334155", mb: 1 }}>
                      No active simulation
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      Select services on the left and click Simulate to observe the blast radius cascade.
                    </Typography>
                  </Box>
                )}

                {(running || result) && (
                  <>
                    {/* Loading bar while streaming */}
                    {isRunning && (
                      <LinearProgress
                        sx={{
                          mb: 2,
                          borderRadius: 2,
                          "& .MuiLinearProgress-bar": { backgroundColor: "#f59e0b" },
                          backgroundColor: "rgba(245,158,11,0.15)",
                        }}
                      />
                    )}

                    {/* Summary chips */}
                    {finalResult ? (
                      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap" }} useFlexGap>
                        <SummaryChip label="Severity" value={finalResult.severity} color={SEVERITY_COLOR[finalResult.severity]} />
                        <SummaryChip label="Blast Radius" value={`${finalResult.blastRadius} services`} color="#6366f1" />
                        <SummaryChip label="Risk Score" value={finalResult.totalRiskScore.toString()} color="#f59e0b" />
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap" }} useFlexGap>
                        <SummaryChip label="Severity" value="…" color="#6366f1" />
                        <SummaryChip label="Blast Radius" value={`${sortedImpacts.filter(i => i.depth > 0).length} so far`} color="#6366f1" />
                        <SummaryChip label="Risk Score" value="…" color="#6366f1" />
                      </Stack>
                    )}

                    {/* Failed services */}
                    <Typography variant="caption" sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", mb: 1 }}>
                      Failed
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: "wrap" }} useFlexGap>
                      {failedServices.map((f) => (
                        <Chip
                          key={f.id}
                          label={f.name}
                          size="small"
                          icon={<ErrorOutlineIcon sx={{ fontSize: "14px !important", color: "#ef4444 !important" }} />}
                          sx={{
                            backgroundColor: "rgba(239,68,68,0.12)",
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.25)",
                            fontWeight: 700,
                          }}
                        />
                      ))}
                    </Stack>

                    {/* Impacted list */}
                    <Typography variant="caption" sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", mb: 1 }}>
                      Impacted ({sortedImpacts.filter((i) => i.depth > 0).length})
                    </Typography>
                    <Box sx={{ maxHeight: 380, overflow: "auto", pr: 0.5 }}>
                      <Stack spacing={1}>
                        {sortedImpacts.filter((i) => i.depth > 0).length === 0 && isRunning && (
                          <Typography variant="body2" sx={{ color: "#475569", py: 2, textAlign: "center" }}>
                            Propagating failure cascade…
                          </Typography>
                        )}
                        {sortedImpacts
                          .filter((i) => i.depth > 0)
                          .map((impact) => {
                            const borderColor = STATUS_COLOR[impact.status];
                            return (
                              <Paper
                                key={impact.serviceId}
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  borderLeft: `3px solid ${borderColor}`,
                                  backgroundColor: `${borderColor}06`,
                                  animation: "slideInLeft 0.35s ease",
                                  border: `1px solid rgba(255,255,255,0.06)`,
                                  borderLeftColor: borderColor,
                                }}
                              >
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                  <Box
                                    sx={{
                                      minWidth: 64,
                                      textAlign: "center",
                                      p: 0.5,
                                      borderRadius: 1,
                                      backgroundColor: "rgba(255,255,255,0.04)",
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color: "#475569", display: "block", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      Depth
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#94a3b8" }}>
                                      {impact.depth}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {impact.serviceName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
                                      {impact.path.join(" → ")}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={impact.status}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${borderColor}18`,
                                      color: borderColor,
                                      fontWeight: 700,
                                      border: `1px solid ${borderColor}33`,
                                      height: 22,
                                      "& .MuiChip-label": { px: 1 },
                                    }}
                                  />
                                </Stack>
                              </Paper>
                            );
                          })}
                      </Stack>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 110,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: `${color}0d`,
        border: `1px solid ${color}2a`,
        textAlign: "center",
      }}
    >
      <Typography variant="caption" sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color, letterSpacing: "-0.01em" }}>
        {value}
      </Typography>
    </Box>
  );
}