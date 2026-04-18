import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listSnapshots, deleteSnapshot, loadSnapshot, type Snapshot } from "./historyStorage";
import type { CaseData } from "./types";
import { Trash2, Download, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "./excelExport";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoad: (cases: CaseData[]) => void;
}

export function HistoryDialog({ open, onOpenChange, onLoad }: Props) {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  useEffect(() => {
    if (open) setSnaps(listSnapshots());
  }, [open]);

  const handleDelete = (id: string, label: string) => {
    if (!window.confirm(`"${label}"을(를) 삭제하시겠습니까?`)) return;
    deleteSnapshot(id);
    setSnaps(listSnapshots());
    toast.success("삭제 완료");
  };

  const handleLoad = (id: string) => {
    const cases = loadSnapshot(id);
    if (cases) onLoad(cases);
  };

  const handleExport = (snap: Snapshot) => {
    exportToExcel(snap.cases, snap.label);
    toast.success("엑셀 다운로드 완료");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>월별 분석 기록</DialogTitle>
          <DialogDescription>
            저장된 분석 결과를 불러오거나 엑셀로 내보낼 수 있습니다. 기록은 이 브라우저에만 저장됩니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {snaps.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              저장된 기록이 없습니다. 분석 후 상단의 <span className="font-semibold">저장</span> 버튼을 누르세요.
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {snaps.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.savedAt).toLocaleString("ko-KR")} · {s.cases.length}건
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleLoad(s.id)} className="gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      불러오기
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleExport(s)} className="gap-1">
                      <Download className="w-3.5 h-3.5" />
                      엑셀
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id, s.label)}
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
