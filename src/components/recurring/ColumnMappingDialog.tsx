import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CsvTable,
  ColumnMapping,
  IMPORT_FIELDS,
  guessMapping,
  mappingIsComplete,
} from "@/utils/recurringBackup";

const NONE = "__none__";

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: CsvTable | null;
  fileName: string;
  onConfirm: (mapping: ColumnMapping) => void;
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  table,
  fileName,
  onConfirm,
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});

  useEffect(() => {
    if (table) setMapping(guessMapping(table.headers));
  }, [table]);

  const complete = useMemo(() => mappingIsComplete(mapping), [mapping]);

  const preview = (header?: string) => {
    if (!table || !header) return null;
    const i = table.headers.indexOf(header);
    if (i < 0) return null;
    const sample = table.rows.slice(0, 2).map((r) => r[i]).filter(Boolean);
    return sample.length ? sample.join(", ") : null;
  };

  const setField = (field: string, value: string) =>
    setMapping((prev) => ({ ...prev, [field]: value === NONE ? undefined : value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match your columns</DialogTitle>
          <DialogDescription className="truncate">
            {fileName} — tell us which column holds each field.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-3">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">{field.label}</label>
                  {field.required ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                </div>
                <Select
                  value={mapping[field.key] ?? NONE}
                  onValueChange={(v) => setField(field.key, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not in file</SelectItem>
                    {table?.headers.map((h, i) => (
                      <SelectItem key={`${h}-${i}`} value={h}>
                        {h || `Column ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {preview(mapping[field.key]) && (
                  <p className="text-xs text-muted-foreground truncate">
                    e.g. {preview(mapping[field.key])}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {!complete && (
          <p className="text-xs text-destructive">
            Map every required field to continue.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!complete} onClick={() => onConfirm(mapping)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
