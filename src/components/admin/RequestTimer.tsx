"use client";

import { useState, useEffect, useTransition } from "react";
import { startTimer, pauseTimer, stopTimer } from "@/app/actions/timer";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface RequestTimerProps {
  requestId: string;
  timerStartedAt: Date | null;
  blockerReason: string | null;
  maxMinutes: number | null;
}

export function RequestTimer({ 
  requestId, 
  timerStartedAt, 
  blockerReason,
  maxMinutes 
}: RequestTimerProps) {
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  useEffect(() => {
    if (!timerStartedAt) {
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(timerStartedAt).getTime();
      const now = new Date().getTime();
      setElapsed(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStartedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const handleStart = () => {
    startTransition(async () => {
      try {
        await startTimer(requestId);
        toast.success("Timer started");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start timer");
      }
    });
  };

  const handlePause = () => {
    setIsPauseDialogOpen(true);
  };

  const confirmPause = () => {
    if (!pauseReason) return;
    startTransition(async () => {
      try {
        const result = await pauseTimer(requestId, pauseReason);
        setIsPauseDialogOpen(false);
        setPauseReason("");
        if (result?.blocked) {
          toast.error(result.message);
          return;
        }
        toast.success("Timer paused");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to pause timer");
      }
    });
  };

  const handleStop = () => {
    startTransition(async () => {
      try {
        const result = await stopTimer(requestId);
        if (result?.blocked) {
          toast.error(result.message);
          return;
        }
        toast.success(`Timer stopped. Logged ${result?.elapsedMinutes || 0} minutes.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to stop timer");
      }
    });
  };

  const isOverCap = maxMinutes && (elapsed / 60) > maxMinutes;

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${timerStartedAt ? "text-green-600 animate-pulse" : "text-slate-400"}`} />
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Work Timer
          </span>
        </div>
        {maxMinutes && (
          <div className="text-[10px] font-medium text-slate-500">
            Cap: {maxMinutes}m
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className={`text-3xl font-mono font-bold ${isOverCap ? "text-red-600" : "text-slate-900"}`}>
          {timerStartedAt ? formatTime(elapsed) : "00:00:00"}
        </div>

        <div className="flex gap-2">
          {!timerStartedAt ? (
            <Button size="sm" onClick={handleStart} disabled={isPending}>
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handlePause} disabled={isPending}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStop} disabled={isPending}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {blockerReason && !timerStartedAt && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded text-amber-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p><strong>Paused:</strong> {blockerReason}</p>
        </div>
      )}

      {isOverCap && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded text-red-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p><strong>Warning:</strong> Time cap exceeded ({maxMinutes}m)</p>
        </div>
      )}

      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for pausing</Label>
              <Input 
                id="reason" 
                placeholder="e.g. Waiting on AHJ callback, Missing info..." 
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPauseDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmPause} disabled={!pauseReason || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pause Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
