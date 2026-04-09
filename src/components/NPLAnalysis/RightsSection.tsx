import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RightsItem } from "./types";
import { Shield, Plus, X } from "lucide-react";

interface Props {
  items: RightsItem[];
  onChange: (items: RightsItem[]) => void;
}

const PRESETS = ["선순위 임차보증금", "가처분", "유치권", "선순위 근저당", "체납 관리비"];

export function RightsSection({ items, onChange }: Props) {
  const addItem = (name?: string) =>
    onChange([...items, { name: name || "", amount: 0 }]);

  const removeItem = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  const updateItem = (index: number, key: keyof RightsItem, value: string | number) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  const total = items.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <Shield className="w-5 h-5" />
          인수권리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => addItem(p)}
            >
              + {p}
            </Button>
          ))}
        </div>

        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="항목명"
              value={item.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
            />
            <Input
              className="w-32"
              type="number"
              placeholder="금액 (만원)"
              value={item.amount || ""}
              onChange={(e) => updateItem(i, "amount", Number(e.target.value))}
            />
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeItem(i)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => addItem()}>
            <Plus className="w-4 h-4 mr-1" /> 항목 추가
          </Button>
          <span className="text-sm font-semibold">
            합계: {total.toLocaleString()} 만원
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
