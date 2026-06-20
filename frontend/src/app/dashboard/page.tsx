"use client";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Paper,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TimelineIcon from "@mui/icons-material/Timeline";
import useSWR from "swr";
import TopBar from "@/components/layout/TopBar";
import { fetcher } from "@/lib/fetcher";
import { CRITICALITY_COLOR, SEVERITY_COLOR } from "@/lib/theme";
import type { DashboardOverview } from "@/types";

function StatCard({
  label,
  value,
  total,
  color,
  icon,
}: {
  label: string;
  value: number;
  total?: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, mb: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, lineHeight: 1.3, flex: 1 }}
          >
            {label}
          </Typography>
          <Box sx={{ color, flexShrink: 0, display: "flex", mt: 0.25 }}>{icon}</Box>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
        {total !== undefined && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.06)",
                "& .MuiLinearProgress-bar": { backgroundColor: color },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {pct.toFixed(0)}% of {total} services
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardOverview>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`,
    fetcher,
    { refreshInterval: 10000 },
  );

  if (isLoading) {
    return (
      <>
        <TopBar title="Dashboard" subtitle="View of system health and resilience" />
        <Box sx={{ p: 4 }}>
          <LinearProgress sx={{ mt: 2 }} />
        </Box>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <TopBar title="Dashboard" />
        <Box sx={{ p: 4 }}>
          <Typography color="error">Failed to load dashboard. Make sure the backend is running on port 4000.</Typography>
        </Box>
      </>
    );
  }

  const { health, topDependencies, recentSimulations, resilience } = data;

  return (
    <>
      <TopBar title="Dashboard" subtitle="View of system health and resilience" />
      <Box sx={{ p: 4 }}>
        {/* Health stats */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Total Services"
              value={health.services.total}
              color="#6366f1"
              icon={<StorageIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Healthy"
              value={health.services.healthy}
              total={health.services.total}
              color="#10b981"
              icon={<CheckCircleIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Degraded"
              value={health.services.degraded}
              total={health.services.total}
              color="#f59e0b"
              icon={<WarningIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Failed"
              value={health.services.failed}
              total={health.services.total}
              color="#ef4444"
              icon={<ErrorIcon />}
            />
          </Grid>
        </Grid>

        <br />

        <Grid container spacing={2.5}>
          {/* Criticality breakdown */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <SecurityIcon color="primary" />
                  <Typography variant="h6">Criticality Distribution</Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                    const count =
                      level === "CRITICAL"
                        ? health.criticality.critical
                        : level === "HIGH"
                          ? health.criticality.high
                          : level === "MEDIUM"
                            ? health.criticality.medium
                            : health.criticality.low;
                    return (
                      <Box key={level}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: 2,
                            width: "100%",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: CRITICALITY_COLOR[level], fontWeight: 700, lineHeight: 1.4 }}
                          >
                            {level}
                          </Typography>
                          <Typography variant="body2" sx={{ flexShrink: 0, fontWeight: 700 }}>
                            {count}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={health.services.total ? (count / health.services.total) * 100 : 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            "& .MuiLinearProgress-bar": { backgroundColor: CRITICALITY_COLOR[level] },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Resilience score */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <TrendingDownIcon color="primary" />
                  <Typography variant="h6">Resilience Score</Typography>
                </Stack>
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 800,
                      color:
                        resilience.score >= 70
                          ? "#10b981"
                          : resilience.score >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {resilience.score}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / 100
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ justifyContent: "center", alignItems: "stretch" }}
                >
                  <Box sx={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                    <Typography variant="h6">{resilience.avgBlastRadius}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
                      Avg Blast Radius
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                    <Typography variant="h6">{resilience.avgDepth}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
                      Avg Depth
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Top dependencies */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <TimelineIcon color="primary" />
                  <Typography variant="h6">Top Blast Radius Risks</Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {topDependencies.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      No dependencies yet
                    </Typography>
                  )}
                  {topDependencies.slice(0, 6).map((dep) => (
                    <Box
                      key={dep.id}
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {dep.name}
                        </Typography>
                        <Chip
                          label={dep.criticality}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            backgroundColor: `${CRITICALITY_COLOR[dep.criticality]}22`,
                            color: CRITICALITY_COLOR[dep.criticality],
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "primary.main", flexShrink: 0, textAlign: "right" }}
                      >
                        {dep.dependents} dependents
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent simulations */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Recent Simulations
                </Typography>
                {recentSimulations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No simulations yet. Run one from the{" "}
                    <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                      Simulate
                    </Box>{" "}
                    page.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {recentSimulations.map((sim) => (
                      <Paper
                        key={sim.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          display: "flex",
                          alignItems: { xs: "flex-start", sm: "center" },
                          gap: 2,
                          flexDirection: { xs: "column", sm: "row" },
                        }}
                      >
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
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sim.failedServices.map((f) => f.serviceName).join(", ") || "Multiple services"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(sim.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: { xs: "left", sm: "right" }, flexShrink: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sim.blastRadius} impacted
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            depth {sim.maxDepth} - score {sim.totalRiskScore}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
