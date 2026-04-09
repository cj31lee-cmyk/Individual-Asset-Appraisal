import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparableCase } from "./types";
import { BarChart3, Plus, X } from "lucide-react";

interface Props {
  items: ComparableCase[];
  onChange: (items: ComparableCase[]) => void;
}

export function ComparablesSection({ items, onChange }: Props) {
  const addItem = () =>
    onChange([...items, { id: crypto.randomUUID(), complex: "", winningBid: 0, bidRate: 0, saleDate: "" }]);

  const removeItem = (id: string) =>
    onChange(items.filter((c) => c.id !== id));

  const updateItem = (id: string, key: keyof ComparableCase, value: string | number) =>
    onChange(items.map((c) => (c.id === id ? { ...c, [key]: value } : c)));

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <BarChart3 className="w-5 h-5" />
          유사사례 (낙찰 3~5건)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            유사 낙찰 사례를 추가해주세요
          </p>
        )}

        {items.map((item) => (
          <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Input
                className="flex-1 mr-2"
                placeholder="단지명"
                value={item.complex}
                onChange={(e) => updateItem(item.id, "complex", e.target.value)}
              />
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeItem(item.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">낙찰가 (만원)</label>
                <Input
                  type="number"
                  placeholder="45,000"
                  value={item.winningBid || ""}
                  onChange={(e) => updateItem(item.id, "winningBid", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">낙찰가율 (%)</label>
                <Input
                  type="number"
                  placeholder="85"
                  value={item.bidRate || ""}
                  onChange={(e) => updateItem(item.id, "bidRate", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">매각일</label>
                <Input
                  type="date"
                  value={item.saleDate}
                  onChange={(e) => updateItem(item.id, "saleDate", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" /> 유사사례 추가
        </Button>
      </CardContent>
    </Card>
  );
}
