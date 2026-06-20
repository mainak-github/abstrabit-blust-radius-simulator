"use client";
import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import LinkIcon from "@mui/icons-material/Link";
import StorageIcon from "@mui/icons-material/Storage";
import useSWR from "swr";
import EmptyState from "@/components/common/EmptyState";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import { CRITICALITY_COLOR, STATUS_COLOR } from "@/lib/theme";
import type { Criticality, Service, ServiceStatus } from "@/types";

export default function ServicesPage() {
  const { data: services, mutate, isLoading } = useSWR<Service[]>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/services`,
    fetcher,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [depCountFilter, setDepCountFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [depDialogFor, setDepDialogFor] = useState<Service | null>(null);

  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setCriticalityFilter("");
    setOwnerFilter("");
    setDepCountFilter("");
  }

  const uniqueOwners = useMemo(() => {
    const owners = (services ?? []).map((s) => s.owner).filter(Boolean);
    return Array.from(new Set(owners)).sort();
  }, [services]);

  const filtered = (services ?? []).filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (criticalityFilter && s.criticality !== criticalityFilter) return false;
    if (ownerFilter && s.owner !== ownerFilter) return false;
    if (depCountFilter) {
      const deps = s._count?.dependsOn ?? 0;
      const dependents = s._count?.dependedOnBy ?? 0;
      if (depCountFilter === "has-deps" && deps === 0) return false;
      if (depCountFilter === "no-deps" && deps > 0) return false;
      if (depCountFilter === "has-dependents" && dependents === 0) return false;
      if (depCountFilter === "no-dependents" && dependents > 0) return false;
      if (depCountFilter === "orphan" && (deps > 0 || dependents > 0)) return false;
      if (depCountFilter === "highly-connected" && (deps + dependents < 3)) return false;
    }
    return true;
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete service "${name}"? This will also remove all its dependencies.`)) return;
    try {
      await api.deleteService(id);
      mutate();
      setSnack({ msg: `Deleted ${name}`, severity: "success" });
    } catch (e: any) {
      setSnack({ msg: e.message || "Failed to delete", severity: "error" });
    }
  }

  return (
    <>
      <TopBar title="Services" subtitle="Manage the services in your distributed system" />
      <Box sx={{ p: 4 }}>
        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <TextField
                placeholder="Search services..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 200 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                label="Status"
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="HEALTHY">Healthy</MenuItem>
                <MenuItem value="DEGRADED">Degraded</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
              </TextField>
              <TextField
                select
                label="Impact Severity"
                size="small"
                value={criticalityFilter}
                onChange={(e) => setCriticalityFilter(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </TextField>
              <TextField
                select
                label="Owner"
                size="small"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueOwners.map((owner) => (
                  <MenuItem key={owner} value={owner}>
                    {owner}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Dependencies"
                size="small"
                value={depCountFilter}
                onChange={(e) => setDepCountFilter(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="has-deps">Has Dependencies</MenuItem>
                <MenuItem value="no-deps">No Dependencies</MenuItem>
                <MenuItem value="has-dependents">Has Dependents</MenuItem>
                <MenuItem value="no-dependents">No Dependents</MenuItem>
                <MenuItem value="orphan">Orphan (No deps/dependents)</MenuItem>
                <MenuItem value="highly-connected">Highly Connected (≥3 total)</MenuItem>
              </TextField>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ ml: { xs: 0, sm: "auto" }, alignSelf: "center", flexShrink: 0 }}
              >
                New Service
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Service grid */}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !services || services.length === 0 ? (
          <EmptyState
            title="No Services Configured"
            description="You don't have any services in your system architecture. Create a new service to start mapping your topology."
            icon={<StorageIcon />}
            actionText="Create Service"
            onActionClick={() => setCreateOpen(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Matching Services"
            description="No services in your system match the active search query or filter options."
            icon={<SearchIcon />}
            actionText="Clear Filters"
            onActionClick={clearFilters}
          />
        ) : (
          <Grid container spacing={2}>
            {filtered.map((s) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={s.id}>
                <Card sx={{ height: "100%", transition: "transform 0.15s", "&:hover": { transform: "translateY(-2px)" } }}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: "break-word", flex: 1, mr: 1 }}>
                        {s.name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEditing(s)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(s.id, s.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      <Chip
                        label={s.status}
                        size="small"
                        sx={{
                          backgroundColor: `${STATUS_COLOR[s.status]}22`,
                          color: STATUS_COLOR[s.status],
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        label={s.criticality}
                        size="small"
                        sx={{
                          backgroundColor: `${CRITICALITY_COLOR[s.criticality]}22`,
                          color: CRITICALITY_COLOR[s.criticality],
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Owner: <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{s.owner}</Box>
                    </Typography>
                    {s.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
                        {s.description}
                      </Typography>
                    )}

                    <Box sx={{ pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          {s._count?.dependsOn ?? 0} deps · {s._count?.dependedOnBy ?? 0} dependents
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<LinkIcon />}
                          onClick={() => setDepDialogFor(s)}
                        >
                          Manage
                        </Button>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {createOpen && (
        <ServiceFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            mutate();
            setSnack({ msg: "Service created", severity: "success" });
          }}
          onError={(msg) => setSnack({ msg, severity: "error" })}
        />
      )}
      {editing && (
        <ServiceFormDialog
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
            setSnack({ msg: "Service updated", severity: "success" });
          }}
          onError={(msg) => setSnack({ msg, severity: "error" })}
        />
      )}
      {depDialogFor && (
        <DependencyDialog
          service={depDialogFor}
          allServices={services ?? []}
          onClose={() => setDepDialogFor(null)}
          onChange={() => mutate()}
          onError={(msg) => setSnack({ msg, severity: "error" })}
          onSuccess={(msg) => setSnack({ msg, severity: "success" })}
        />
      )}

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

function ServiceFormDialog({
  service,
  onClose,
  onSaved,
  onError,
}: {
  service?: Service;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [owner, setOwner] = useState(service?.owner ?? "");
  const [criticality, setCriticality] = useState<Criticality>(service?.criticality ?? "MEDIUM");
  const [status, setStatus] = useState<ServiceStatus>(service?.status ?? "HEALTHY");
  const [description, setDescription] = useState(service?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (service) {
        await api.updateService(service.id, { name, owner, criticality, status, description });
      } else {
        await api.createService({ name, owner, criticality, status, description });
      }
      onSaved();
    } catch (e: any) {
      onError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{service ? "Edit Service" : "Create Service"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} required fullWidth />
          <TextField
            select
            label="Criticality"
            value={criticality}
            onChange={(e) => setCriticality(e.target.value as Criticality)}
            fullWidth
          >
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
          </TextField>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ServiceStatus)}
            fullWidth
          >
            <MenuItem value="HEALTHY">Healthy</MenuItem>
            <MenuItem value="DEGRADED">Degraded</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !name || !owner}
        >
          {saving ? <CircularProgress size={20} /> : service ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DependencyDialog({
  service,
  allServices,
  onClose,
  onChange,
  onError,
  onSuccess,
}: {
  service: Service;
  allServices: Service[];
  onClose: () => void;
  onChange: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const { data: deps, mutate: mutateDeps } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/dependencies`,
    fetcher,
  );

  const [target, setTarget] = useState("");

  const candidates = allServices.filter((s) => s.id !== service.id);

  const myDeps = (deps ?? []).filter((d: any) => d.serviceId === service.id);
  const dependents = (deps ?? []).filter((d: any) => d.dependsOnServiceId === service.id);

  async function add() {
    if (!target) return;
    try {
      await api.createDependency(service.id, target);
      setTarget("");
      mutateDeps();
      onChange();
      onSuccess("Dependency added");
    } catch (e: any) {
      onError(e.message || "Failed to add dependency");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteDependency(id);
      mutateDeps();
      onChange();
      onSuccess("Dependency removed");
    } catch (e: any) {
      onError(e.message || "Failed to remove dependency");
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage dependencies for {service.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Add dependency
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                select
                fullWidth
                size="small"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Choose a service that this service depends on"
              >
                {candidates.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.owner})
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={add} disabled={!target}>
                Add
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Depends on ({myDeps.length})
            </Typography>
            {myDeps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No dependencies yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {myDeps.map((d: any) => (
                  <Stack
                    key={d.id}
                    direction="row"
                    sx={{ p: 1, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.03)", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Typography variant="body2">{d.dependsOn?.name}</Typography>
                    <IconButton size="small" onClick={() => remove(d.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Used by ({dependents.length})
            </Typography>
            {dependents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No dependents yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {dependents.map((d: any) => (
                  <Box
                    key={d.id}
                    sx={{ p: 1, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <Typography variant="body2">{d.service?.name}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}