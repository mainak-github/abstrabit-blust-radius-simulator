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
  Skeleton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
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
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
        },
      }}
    >
      <CardContent sx={{ pt: 3 }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#475569", lineHeight: 1.3, flex: 1 }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              backgroundColor: `${color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 800, color, letterSpacing: "-0.02em", mb: 0.5 }}>
          {value}
        </Typography>
        {total !== undefined && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 4,
                borderRadius: 2,
                mt: 1,
                "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 2 },
              }}
            />
            <Typography variant="caption" sx={{ color: "#475569", mt: 0.5, display: "block" }}>
              {pct.toFixed(0)}% of {total} services
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ResilienceGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Resilient" : score >= 40 ? "Moderate Risk" : "High Risk";
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={130} height={130} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={65} cy={65} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={65}
          cy={65}
          r={52}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease", filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <Box sx={{ position: "absolute", textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.65rem" }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <TopBar title="Dashboard" subtitle="System health & resilience overview" />
      <Box sx={{ p: 4 }}>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card sx={{ height: 120 }}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={48} />
                  <Skeleton variant="rectangular" height={4} sx={{ mt: 1, borderRadius: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2.5}>
          {[0, 1, 2].map((i) => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Card sx={{ height: 280 }}>
                <CardContent>
                  <Skeleton variant="text" width="50%" height={28} />
                  <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardOverview>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`,
    fetcher,
    { refreshInterval: 10000 },
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <>
        <TopBar title="Dashboard" />
        <Box sx={{ p: 4 }}>
          <Card sx={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <ErrorIcon sx={{ color: "#ef4444" }} />
                <Box>
                  <Typography sx={{ fontWeight: 600, color: "#ef4444" }}>Backend connection failed</Typography>
                  <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
                    Make sure the backend is running on port 4000. Run <code style={{ color: "#818cf8" }}>npm run dev</code> in the backend directory.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </>
    );
  }

  const { health, topDependencies, recentSimulations, resilience } = data;

  return (
    <>
      <TopBar title="Dashboard" subtitle="System health & resilience overview" />
      <Box sx={{ p: 4 }}>
        {/* Stat Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Total Services" value={health.services.total} color="#6366f1" icon={<StorageIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Healthy" value={health.services.healthy} total={health.services.total} color="#10b981" icon={<CheckCircleIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Degraded" value={health.services.degraded} total={health.services.total} color="#f59e0b" icon={<WarningIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Failed" value={health.services.failed} total={health.services.total} color="#ef4444" icon={<ErrorIcon fontSize="small" />} />
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          {/* Criticality Distribution */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
                  <SecurityIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                  <Typography variant="h6">Criticality Distribution</Typography>
                </Stack>
                <Stack spacing={2}>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                    const count =
                      level === "CRITICAL"
                        ? health.criticality.critical
                        : level === "HIGH"
                          ? health.criticality.high
                          : level === "MEDIUM"
                            ? health.criticality.medium
                            : health.criticality.low;
                    const color = CRITICALITY_COLOR[level];
                    const pct = health.services.total ? (count / health.services.total) * 100 : 0;
                    return (
                      <Box key={level}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                          <Typography variant="body2" sx={{ color, fontWeight: 700, fontSize: "0.8rem" }}>
                            {level}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#94a3b8" }}>
                            {count}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: color,
                              borderRadius: 3,
                              boxShadow: `0 0 8px ${color}66`,
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Resilience Score */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
                  <TrendingUpIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                  <Typography variant="h6">Resilience Score</Typography>
                </Stack>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <ResilienceGauge score={resilience.score} />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1}>
                  <Grid size={6}>
                    <Box sx={{ textAlign: "center", p: 1.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#6366f1" }}>
                        {resilience.avgBlastRadius}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#475569", display: "block", lineHeight: 1.3 }}>
                        Avg Blast Radius
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={6}>
                    <Box sx={{ textAlign: "center", p: 1.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#3b82f6" }}>
                        {resilience.avgDepth}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#475569", display: "block", lineHeight: 1.3 }}>
                        Avg Depth
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Blast Radius Risks */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
                  <TimelineIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                  <Typography variant="h6">Top Blast Risks</Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {topDependencies.length === 0 ? (
                    <Typography variant="caption" sx={{ color: "#475569" }}>
                      No dependencies configured yet.
                    </Typography>
                  ) : (
                    topDependencies.slice(0, 6).map((dep, idx) => (
                      <Box
                        key={dep.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          p: 1,
                          borderRadius: 1.5,
                          backgroundColor: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          transition: "background 0.15s",
                          "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                          <Typography variant="caption" sx={{ color: "#334155", fontWeight: 700, width: 16, textAlign: "center" }}>
                            {idx + 1}
                          </Typography>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {dep.name}
                            </Typography>
                            <Chip
                              label={dep.criticality}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.65rem",
                                backgroundColor: `${CRITICALITY_COLOR[dep.criticality]}18`,
                                color: CRITICALITY_COLOR[dep.criticality],
                                fontWeight: 700,
                                "& .MuiChip-label": { px: 0.75 },
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#6366f1", flexShrink: 0 }}>
                          {dep.dependents}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Simulations */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2.5 }}>
                  Recent Simulations
                </Typography>
                {recentSimulations.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      No simulations yet.{" "}
                      <Box component="span" sx={{ color: "#6366f1", fontWeight: 600 }}>
                        Run one from the Simulate page.
                      </Box>
                    </Typography>
                  </Box>
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
                          transition: "border-color 0.15s, background 0.15s",
                          "&:hover": {
                            borderColor: "rgba(99,102,241,0.3)",
                            backgroundColor: "rgba(99,102,241,0.04)",
                          },
                        }}
                      >
                        <Chip
                          label={sim.severity}
                          size="small"
                          sx={{
                            backgroundColor: `${SEVERITY_COLOR[sim.severity]}18`,
                            color: SEVERITY_COLOR[sim.severity],
                            fontWeight: 700,
                            minWidth: 80,
                            border: `1px solid ${SEVERITY_COLOR[sim.severity]}33`,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {sim.failedServices.map((f) => f.serviceName).join(", ") || "Multiple services"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#475569" }}>
                            {new Date(sim.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={3} sx={{ flexShrink: 0 }}>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#6366f1" }}>
                              {sim.blastRadius}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#475569" }}>
                              impacted
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#3b82f6" }}>
                              {sim.maxDepth}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#475569" }}>
                              depth
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#f59e0b" }}>
                              {sim.totalRiskScore}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#475569" }}>
                              risk
                            </Typography>
                          </Box>
                        </Stack>
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
