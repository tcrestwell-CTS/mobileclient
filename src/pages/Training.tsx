import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Play,
  Clock,
  Award,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import {
  useTrainingModules,
  useMyTrainingProgress,
  useUpdateTrainingProgress,
  useCreateTrainingModule,
} from "@/hooks/useTrainingModules";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

const CATEGORY_EMOJI: Record<string, string> = {
  general: "📚",
  destinations: "🌍",
  cruises: "🚢",
  specialty: "⭐",
  compliance: "🛡️",
  technology: "💻",
};

const Training = () => {
  const { data: modules, isLoading: modulesLoading } = useTrainingModules();
  const { data: myProgress, isLoading: progressLoading } = useMyTrainingProgress();
  const updateProgress = useUpdateTrainingProgress();
  const createModule = useCreateTrainingModule();
  const { isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed" | "new">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newModule, setNewModule] = useState({
    title: "",
    description: "",
    category: "general",
    is_required: false,
    estimated_minutes: 30,
    resource_url: "",
  });

  const loading = modulesLoading || progressLoading;

  const getModuleStatus = (moduleId: string) => {
    const p = myProgress?.find((pr) => pr.module_id === moduleId);
    return p?.status || "not_started";
  };

  const enrichedModules = (modules || [])
    .map((m) => ({
      ...m,
      status: getModuleStatus(m.id),
    }))
    .filter((m) => {
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "in_progress") return m.status === "in_progress";
      if (filter === "completed") return m.status === "completed";
      if (filter === "new") return m.status === "not_started";
      return true;
    });

  const stats = {
    total: modules?.length || 0,
    completed: myProgress?.filter((p) => p.status === "completed").length || 0,
    inProgress: myProgress?.filter((p) => p.status === "in_progress").length || 0,
    totalMinutes: (modules || []).reduce((sum, m) => sum + (m.estimated_minutes || 0), 0),
  };

  const handleStartOrContinue = async (moduleId: string, currentStatus: string) => {
    if (currentStatus === "not_started") {
      await updateProgress.mutateAsync({ moduleId, status: "in_progress" });
      toast.success("Module started!");
    }
  };

  const handleComplete = async (moduleId: string) => {
    await updateProgress.mutateAsync({ moduleId, status: "completed" });
    toast.success("Module completed! 🎉");
  };

  const handleAddModule = async () => {
    if (!newModule.title) return;
    try {
      await createModule.mutateAsync(newModule);
      toast.success("Training module added");
      setAddOpen(false);
      setNewModule({ title: "", description: "", category: "general", is_required: false, estimated_minutes: 30, resource_url: "" });
    } catch {
      toast.error("Failed to add module");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Training Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Expand your expertise and earn certifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <span className="font-semibold">{stats.completed} Completed</span>
          </div>
          {isAdmin && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Training Module</DialogTitle>
                  <DialogDescription>Create a new training module for your team</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={newModule.title}
                      onChange={(e) => setNewModule((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Caribbean Specialist Certification"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newModule.description}
                      onChange={(e) => setNewModule((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of the module"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={newModule.category}
                        onValueChange={(v) => setNewModule((p) => ({ ...p, category: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="destinations">Destinations</SelectItem>
                          <SelectItem value="cruises">Cruises</SelectItem>
                          <SelectItem value="specialty">Specialty</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={newModule.estimated_minutes}
                        onChange={(e) => setNewModule((p) => ({ ...p, estimated_minutes: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Resource URL</Label>
                    <Input
                      value={newModule.resource_url}
                      onChange={(e) => setNewModule((p) => ({ ...p, resource_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newModule.is_required}
                      onCheckedChange={(v) => setNewModule((p) => ({ ...p, is_required: v }))}
                    />
                    <Label>Required for all agents</Label>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddModule} disabled={createModule.isPending || !newModule.title}>
                      {createModule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Module
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-card-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Courses Available</p>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
            <Award className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-card-foreground">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-card-foreground">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-card-foreground">{Math.round(stats.totalMinutes / 60)}h</p>
            <p className="text-sm text-muted-foreground">Total Learning</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "in_progress", "completed", "new"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f === "completed" ? "Completed" : "New"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      {enrichedModules.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-1">
            {modules?.length === 0 ? "No training modules yet" : "No matching modules"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {modules?.length === 0
              ? isAdmin
                ? "Add your first training module to get started."
                : "Your admin hasn't added any training modules yet."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedModules.map((module) => (
            <div
              key={module.id}
              className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-28 bg-gradient-ocean flex items-center justify-center">
                <span className="text-4xl">
                  {CATEGORY_EMOJI[module.category] || "📚"}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {module.category}
                  </Badge>
                  {module.is_required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  {module.status === "completed" && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-card-foreground mb-2">{module.title}</h3>
                {module.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {module.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {module.estimated_minutes}m
                  </span>
                </div>

                {module.status === "in_progress" && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">In Progress</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2">
                  {module.status === "completed" ? (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <Award className="h-4 w-4" />
                      Completed
                    </Button>
                  ) : module.status === "in_progress" ? (
                    <>
                      {module.resource_url && (
                        <Button variant="outline" className="flex-1 gap-2" asChild>
                          <a href={module.resource_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </a>
                        </Button>
                      )}
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleComplete(module.id)}
                        disabled={updateProgress.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Done
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleStartOrContinue(module.id, module.status)}
                      disabled={updateProgress.isPending}
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Training;
