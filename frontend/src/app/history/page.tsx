"use client";
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  Button,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import HistoryIcon from "@mui/icons-material/History";
import useSWR from "swr";
import EmptyState from "@/components/common/EmptyState";
import TopBar from "@/components/layout/TopBar";
import { fetcher } from "@/lib/fetcher";
import { SEVERITY_COLOR, STATUS_COLOR } from "@/lib/theme";
import type { Simulation } from "@/types";

export default function HistoryPage() {
  const { data: simulations, isLoading } = useSWR<Simulation[]>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/simulations`,
    fetcher,
    { refreshInterval: 10000 },
  );

  const [selected, setSelected] = useState<Simulation | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const simA = simulations?.find((s) => s.id === compareA) ?? null;
  const simB = simulations?.find((s) => s.id === compareB) ?? null;

  return (
    <>
      <TopBar title="Simulation History" subtitle="Browse, replay, and compare past simulations" />
      <Box sx={{ p: 4 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !simulations || simulations.length === 0 ? (
          <EmptyState
            title="No Simulation History"
            description="You haven't run any failure drills yet. Start a simulation to see how outages cascade through your service ecosystem."
            icon={<HistoryIcon />}
            actionText="Simulate Outage"
            actionHref="/simulation"
          />
        ) : (
          <>
            {(simA && simB) && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                    <CompareArrowsIcon color="primary" />
                    <Typography variant="h6">Comparison</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      size="small"
                      onClick={() => {
                        setCompareA(null);
                        setCompareB(null);
                      }}
                    >
                      Clear
                    </Button>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <ComparisonPanel sim={simA} label="A" />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <ComparisonPanel sim={simB} label="B" />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            <Stack spacing={1.5}>
              {simulations.map((sim) => {
                const failed = sim.failedServices.map((f) => f.serviceName).join(", ");
                return (
                  <Paper
                    key={sim.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      transition: "all 0.15s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Chip
                        label={sim.severity}
                        size="small"
                        sx={{
                          backgroundColor: `${SEVERITY_COLOR[sim.severity]}22`,
                          color: SEVERITY_COLOR[sim.severity],
                          fontWeight: 700,
                          minWidth: 90,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                          {sim.name || (failed ? `Failed: ${failed}` : "Multi-service simulation")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                          {sim.name && failed ? `Failed: ${failed} · ` : ""}{new Date(sim.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={3} sx={{ alignItems: "center", flexShrink: 0 }}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {sim.blastRadius}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            blast
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {sim.maxDepth}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            depth
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {sim.totalRiskScore}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            risk
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Tooltip title={compareA === sim.id ? "Selected for compare A" : "Compare A"}>
                          <Button
                            size="small"
                            variant={compareA === sim.id ? "contained" : "outlined"}
                            onClick={() => setCompareA(compareA === sim.id ? null : sim.id)}
                          >
                            A
                          </Button>
                        </Tooltip>
                        <Tooltip title={compareB === sim.id ? "Selected for compare B" : "Compare B"}>
                          <Button
                            size="small"
                            variant={compareB === sim.id ? "contained" : "outlined"}
                            onClick={() => setCompareB(compareB === sim.id ? null : sim.id)}
                          >
                            B
                          </Button>
                        </Tooltip>
                        <Button size="small" variant="text" onClick={() => setSelected(sim)}>
                          Details
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </>
        )}
      </Box>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{selected?.name || "Simulation Details"}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selected && new Date(selected.createdAt).toLocaleString()}
            </Typography>
          </Box>
          <IconButton onClick={() => setSelected(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selected && (
            <>
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Metric label="Severity" value={selected.severity} color={SEVERITY_COLOR[selected.severity]} />
                <Metric label="Blast Radius" value={String(selected.blastRadius)} color="#6366f1" />
                <Metric label="Max Depth" value={String(selected.maxDepth)} color="#3b82f6" />
                <Metric label="Risk Score" value={String(selected.totalRiskScore)} color="#f59e0b" />
              </Stack>

              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Failed services
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap" }} useFlexGap>
                {selected.failedServices.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.serviceName}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      fontWeight: 700,
                    }}
                  />
                ))}
              </Stack>

              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Impacted services ({selected.impactedServices.length})
              </Typography>
              <Box sx={{ maxHeight: 360, overflow: "auto" }}>
                <Stack spacing={1}>
                  {selected.impactedServices
                    .sort((a, b) => a.depth - b.depth)
                    .map((i) => {
                      let path: string[] = [];
                      try {
                        path = JSON.parse(i.path);
                      } catch {
                        // ignore
                      }
                      return (
                        <Paper
                          key={i.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderLeft: `3px solid ${STATUS_COLOR[i.status]}`,
                          }}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Chip
                              label={`Depth ${i.depth}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 700,
                                minWidth: 70,
                                backgroundColor: "rgba(255,255,255,0.06)",
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {i.serviceName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {path.join(" → ")}
                              </Typography>
                            </Box>
                            <Chip
                              label={i.status}
                              size="small"
                              sx={{
                                backgroundColor: `${STATUS_COLOR[i.status]}22`,
                                color: STATUS_COLOR[i.status],
                                fontWeight: 700,
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
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComparisonPanel({ sim, label }: { sim: Simulation; label: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <Chip label={label} size="small" color="primary" sx={{ fontWeight: 700 }} />
        <Typography variant="caption" color="text.secondary">
          {new Date(sim.createdAt).toLocaleString()}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Row k="Severity" v={sim.severity} color={SEVERITY_COLOR[sim.severity]} />
        <Row k="Blast Radius" v={sim.blastRadius.toString()} />
        <Row k="Max Depth" v={sim.maxDepth.toString()} />
        <Row k="Risk Score" v={sim.totalRiskScore.toString()} />
        <Row k="Failed" v={sim.failedServices.map((f) => f.serviceName).join(", ")} />
      </Stack>
    </Box>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="caption" color="text.secondary">
        {k}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color, maxWidth: "60%", textAlign: "right" }} noWrap>
        {v}
      </Typography>
    </Stack>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box sx={{ flex: 1, textAlign: "center", p: 1.5, borderRadius: 2, backgroundColor: `${color}11`, border: `1px solid ${color}33` }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color }}>
        {value}
      </Typography>
    </Box>
  );
}