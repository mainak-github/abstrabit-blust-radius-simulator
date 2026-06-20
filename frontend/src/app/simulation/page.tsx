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
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
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

  // When the simulation ends via socket, we already have the final summary.
  // But we keep the full result from the POST response for the full impact list.
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

  function clearSelection() {
    setSelected(new Set());
    setName("");
  }

  const sortedImpacts = Array.from(liveImpacts.values()).sort(
    (a, b) => a.depth - b.depth || a.serviceName.localeCompare(b.serviceName),
  );

  return (
    <>
      <TopBar title="Failure Simulation" subtitle="Simulate service outages and observe blast radius" />
      <Box sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {/* Service selector */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Select Services to Fail</Typography>
                  {selected.size > 0 && (
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={clearSelection}>
                      Clear
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
                <Box sx={{ maxHeight: 400, overflow: "auto", pr: 1 }}>
                  <Stack spacing={1}>
                    {(services ?? []).map((s) => {
                      const isSelected = selected.has(s.id);
                      return (
                        <Paper
                          key={s.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            border: isSelected ? "2px solid" : "1px solid",
                            borderColor: isSelected ? "primary.main" : "divider",
                            backgroundColor: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                            transition: "all 0.15s",
                            "&:hover": { borderColor: "primary.main" },
                          }}
                          onClick={() => toggle(s.id)}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                border: "2px solid",
                                borderColor: isSelected ? "primary.main" : "rgba(255,255,255,0.2)",
                                backgroundColor: isSelected ? "primary.main" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                color: "white",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {isSelected ? "" : ""}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {s.owner}
                              </Typography>
                            </Box>
                            <Chip
                              label={s.criticality}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                backgroundColor: `${CRITICALITY_COLOR[s.criticality]}22`,
                                color: CRITICALITY_COLOR[s.criticality],
                                fontWeight: 700,
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
                >
                  {running ? "Simulating..." : `Simulate ${selected.size} Failure${selected.size === 1 ? "" : "s"}`}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Impact panel */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ minHeight: 600 }}>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Impact Analysis</Typography>
                  {isRunning && (
                    <Chip
                      icon={<CircularProgress size={14} />}
                      label="Live"
                      color="warning"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>

                {!running && !result && (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <BoltIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                    <Typography color="text.secondary">
                      Select services and run a simulation to see the impact analysis.
                    </Typography>
                  </Box>
                )}

                {(running || result) && (
                  <>
                    {/* Summary */}
                    {finalResult && (
                      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                        <SummaryChip
                          label="Severity"
                          value={finalResult.severity}
                          color={SEVERITY_COLOR[finalResult.severity]}
                        />
                        <SummaryChip
                          label="Blast Radius"
                          value={finalResult.blastRadius.toString()}
                          color="#6366f1"
                        />
                        <SummaryChip
                          label="Risk Score"
                          value={finalResult.totalRiskScore.toString()}
                          color="#f59e0b"
                        />
                      </Stack>
                    )}

                    {running && !finalResult && (
                      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                        <SummaryChip label="Severity" value="..." color="#6366f1" />
                        <SummaryChip label="Blast Radius" value={sortedImpacts.length.toString()} color="#6366f1" />
                        <SummaryChip label="Risk Score" value="..." color="#6366f1" />
                      </Stack>
                    )}

                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      Failed services
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap" }} useFlexGap>
                      {failedServices.map((f) => (
                        <Chip
                          key={f.id}
                          label={f.name}
                          size="small"
                          sx={{
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            color: "#ef4444",
                            fontWeight: 700,
                            mb: 0.5,
                          }}
                        />
                      ))}
                    </Stack>

                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      Impacted services ({sortedImpacts.filter((i) => i.depth > 0).length})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                      <Stack spacing={1}>
                        {sortedImpacts.filter((i) => i.depth > 0).length === 0 && running && (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Propagating failure...
                          </Typography>
                        )}
                        {sortedImpacts
                          .filter((i) => i.depth > 0)
                          .map((impact) => (
                            <Paper
                              key={impact.serviceId}
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderLeft: `3px solid ${STATUS_COLOR[impact.status]}`,
                                backgroundColor: `${STATUS_COLOR[impact.status]}08`,
                                animation: "fadeIn 0.4s ease",
                              }}
                            >
                              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                <Chip
                                  label={`Depth ${impact.depth}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    minWidth: 70,
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                  }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {impact.serviceName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    Path: {impact.path.join(" → ")}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={impact.status}
                                  size="small"
                                  sx={{
                                    backgroundColor: `${STATUS_COLOR[impact.status]}22`,
                                    color: STATUS_COLOR[impact.status],
                                    fontWeight: 700,
                                  }}
                                />
                              </Stack>
                            </Paper>
                          ))}
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

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: `${color}11`,
        border: `1px solid ${color}33`,
        textAlign: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color }}>
        {value}
      </Typography>
    </Box>
  );
}