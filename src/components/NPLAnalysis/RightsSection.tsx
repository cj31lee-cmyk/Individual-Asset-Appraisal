import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { RightsItem } from "./types";
import { Shield, Plus, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  items: RightsItem[];
  onChange: (items: RightsItem[]) => void;
}

const RIGHTS_CATEGORIES = [
  {
    label: "담보권",
    items: ["선순위 근저당", "선순위 저당권", "선순위 질권"],
  },
  {
    label: "압류·가압류",
    items: ["가압류", "압류", "체납처분 압류 (국세)", "체납처분 압류 (지방세)", "교부청구"],
  },
  {
    label: "용익물권",
    items: ["지상권", "지역권", "전세권", "분묘기지권", "법정지상권"],
  },
  {
    label: "임차권",
    items: [
      "선순위 임차보증금 (대항력)",
      "소액임차보증금 (최우선변제)",
      "확정일자 임차권",
      "상가임차권",
    ],
  },
  {
    label: "기타 권리",
    items: [
      "유치권",
      "가처분 (처분금지)",
      "가처분 (점유이전금지)",
      "가등기",
      "예고등기",
      "환매등기",
      "신탁등기",
      "체납 관리비",
      "체납 공과금",
    ],
  },
];

const ALL_PRESETS = RIGHTS_CATEGORIES.flatMap((c) => c.items);

export function RightsSection({ items, onChange }: Props) {
  const addItem = (name?: string) =>
    onChange([...items, { name: name || "", amount: 0, date: "" }]);

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
        {/* 카테고리별 프리셋 */}
        <div className="space-y-2">
          {RIGHTS_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{cat.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((p) => (
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
            </div>
          ))}
        </div>

        {/* 입력된 항목 */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <Select
                  value={ALL_PRESETS.includes(item.name) ? item.name : "__custom__"}
                  onValueChange={(v) => {
                    if (v === "__custom__") return;
                    updateItem(i, "name", v);
                  }}
                >
                  <SelectTrigger className="flex-1 min-w-[140px] text-xs h-9">
                    <SelectValue placeholder="권리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {RIGHTS_CATEGORIES.map((cat) => (
                      <div key={cat.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {cat.label}
                        </div>
                        {cat.items.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs">
                            {p}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    <SelectItem value="__custom__" className="text-xs">
                      직접 입력
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(!ALL_PRESETS.includes(item.name)) && (
                  <Input
                    className="flex-1 min-w-[100px] text-xs h-9"
                    placeholder="항목명 직접 입력"
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                  />
                )}

                {/* 설정일자 (등기접수일) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left text-xs h-9 font-normal",
                        !item.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                      {item.date ? format(new Date(item.date), "yyyy.MM.dd") : "설정일"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={item.date ? new Date(item.date) : undefined}
                      onSelect={(d) => updateItem(i, "date", d ? format(d, "yyyy-MM-dd") : "")}
                      locale={ko}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  className="w-28 text-xs h-9"
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
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => addItem()}>
            <Plus className="w-4 h-4 mr-1" /> 직접 추가
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            합계: {total.toLocaleString()} 만원
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
