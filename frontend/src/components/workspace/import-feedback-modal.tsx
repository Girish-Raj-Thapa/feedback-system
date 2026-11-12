"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  FeedbackCategory,
  FeedbackForm,
  FeedbackImportRequest,
  FeedbackImportResponse,
} from "@/types/feedback";

export interface ImportFeedbackModalProps {
  isOpen: boolean;
  workspaceId: string;
  forms: FeedbackForm[];
  categories: FeedbackCategory[];
  onClose: () => void;
  onSuccess: (result: FeedbackImportResponse) => Promise<void> | void;
}

type ImportTab = "csv" | "paste";

const STARTER_CSV_TEMPLATE = [
  "comment,rating,category,customer_name,customer_email,source,plan_tier,page_url,created_at",
  '"Checkout page takes too long on mobile",2,"Performance & Speed","Maya Lin","maya@acme.io","intercom","Pro","https://app.acme.io/checkout","2026-10-01T14:20:00Z"',
  '"Love the new keyboard shortcuts in the inbox",5,"Product & UX","Sam Patel","sam@northstar.dev","typeform","Enterprise","https://app.acme.io/inbox","2026-10-03T09:15:00Z"',
  '"Pricing page lacks annual discount breakdown",3,"Pricing & Plans","Alex Kim","alex@studio.co","csv_import","Starter","https://app.acme.io/pricing","2026-10-05T18:00:00Z"',
].join("\n");

interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  totalDataRows: number;
}

function parseCsvRecords(input: string, maxRows = 600): string[][] {
  const cleaned = input.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((val) => val.length > 0)) {
        records.push(row);
        if (records.length >= maxRows) {
          return records;
        }
      }
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((val) => val.length > 0)) {
    records.push(row);
  }
  return records;
}

function buildCsvPreview(csvText: string): CsvPreviewData | null {
  if (!csvText.trim()) return null;
  const records = parseCsvRecords(csvText);
  if (records.length === 0) return null;

  const [headers, ...dataRows] = records;
  return {
    headers,
    rows: dataRows.slice(0, 3),
    totalDataRows: dataRows.length,
  };
}

async function readUploadedFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read CSV file"));
    reader.readAsText(file);
  });
}

function extractErrorMessage(err: unknown): string {
  const candidate = err as {
    detail?: string;
    response?: { data?: { detail?: string } };
    message?: string;
  };
  return (
    candidate.detail ||
    candidate.response?.data?.detail ||
    candidate.message ||
    "Failed to import feedback"
  );
}

export function ImportFeedbackModal({
  isOpen,
  workspaceId,
  forms,
  categories,
  onClose,
  onSuccess,
}: ImportFeedbackModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>("csv");
  const [csvText, setCsvText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultRating, setDefaultRating] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<FeedbackImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectableCategories = useMemo(
    () => categories.filter((c) => !c.is_uncategorized),
    [categories]
  );

  const csvPreview = useMemo(() => buildCsvPreview(csvText), [csvText]);

  const pastedLines = useMemo(
    () =>
      pasteText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [pasteText]
  );

  if (!isOpen) return null;

  const canSubmit =
    !isSubmitting &&
    (activeTab === "csv"
      ? csvText.trim().length > 0 && (csvPreview?.totalDataRows ?? 0) <= 500
      : pastedLines.length > 0 && pastedLines.length <= 500);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubmitError(null);
    setImportResult(null);

    try {
      const content = await readUploadedFileText(file);
      setCsvText(content);
      setSelectedFileName(file.name);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([STARTER_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "feedback-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload: FeedbackImportRequest =
      activeTab === "csv"
        ? {
            form_id: selectedFormId || null,
            default_source: "csv_import",
            csv_text: csvText,
            default_rating: defaultRating ? Number(defaultRating) : null,
            default_category_id: defaultCategoryId || null,
          }
        : {
            form_id: selectedFormId || null,
            default_source: "manual_paste",
            paste_lines: pastedLines,
            default_rating: defaultRating ? Number(defaultRating) : null,
            default_category_id: defaultCategoryId || null,
          };

    setIsSubmitting(true);
    try {
      const result = await feedbackRepository.importSubmissions(
        workspaceId,
        payload
      );
      setImportResult(result);
      await onSuccess(result);

      if (result.errors.length === 0) {
        toast.success(
          `Imported ${result.imported_count} ${
            result.imported_count === 1 ? "response" : "responses"
          } (${result.categorized_count} auto-categorized)`
        );
        onClose();
      } else {
        toast.warning(
          `Imported ${result.imported_count} responses; ${result.skipped_count} rows skipped`
        );
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-feedback-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[14px] border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-action-subtle text-action">
              <Upload className="size-4" />
            </div>
            <div>
              <h2
                id="import-feedback-modal-title"
                className="text-[17px] font-semibold text-text"
              >
                Import customer feedback
              </h2>
              <p className="text-[13px] text-text-muted">
                Backfill CSV exports or paste notes directly. Historical imports do not trigger Slack alerts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close import modal"
            className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-between border-b border-border bg-canvas/50 px-6 py-2.5">
          <div
            role="tablist"
            aria-label="Import mode"
            className="inline-flex rounded-[9px] border border-border bg-surface p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "csv"}
              onClick={() => {
                setActiveTab("csv");
                setSubmitError(null);
              }}
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                activeTab === "csv"
                  ? "bg-action text-white shadow-2xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Upload CSV
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "paste"}
              onClick={() => {
                setActiveTab("paste");
                setSubmitError(null);
              }}
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                activeTab === "paste"
                  ? "bg-action text-white shadow-2xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Paste feedback
            </button>
          </div>

          <span className="text-[11px] font-medium tabular-nums text-text-muted">
            Up to 500 rows per batch
          </span>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          {activeTab === "csv" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed border-border bg-canvas px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="size-5 shrink-0 text-action" />
                  <div>
                    <p className="text-[13px] font-medium text-text">
                      {selectedFileName
                        ? selectedFileName
                        : "Choose a .csv file or paste CSV rows below"}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Recognizes comment, rating, category, email, name, source, plan_tier, page_url, created_at
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1 rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text transition-colors hover:bg-hover"
                  >
                    <Download className="size-3.5" />
                    <span>Starter template</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    aria-label="Choose CSV file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-[8px] bg-action-subtle px-3 py-1.5 text-[12px] font-medium text-action transition-colors hover:bg-action hover:text-white"
                  >
                    <Upload className="size-3.5" />
                    <span>Select file</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="csv-import-textarea"
                  className="text-[12px] font-semibold text-text"
                >
                  CSV content
                </label>
                <textarea
                  id="csv-import-textarea"
                  aria-label="CSV content"
                  rows={5}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder={
                    "comment,rating,category,source,plan_tier\n\"Billing export is hard to find\",2,Pricing,intercom,Pro"
                  }
                  className="w-full rounded-[8px] border border-border bg-canvas p-3 font-mono text-[12px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
                />
              </div>

              {csvPreview && (
                <div className="overflow-hidden rounded-[10px] border border-border bg-canvas/60">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] font-medium text-text-muted">
                    <span>
                      Preview ({csvPreview.rows.length} of{" "}
                      <span className="tabular-nums font-semibold text-text">
                        {csvPreview.totalDataRows}
                      </span>{" "}
                      {csvPreview.totalDataRows === 1 ? "row" : "rows"})
                    </span>
                    {csvPreview.totalDataRows > 500 && (
                      <span className="font-semibold text-status-error">
                        Exceeds 500-row batch limit
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b border-border bg-surface text-text-muted">
                        <tr>
                          {csvPreview.headers.map((header, idx) => (
                            <th
                              key={`${header}-${idx}`}
                              className="px-3 py-1.5 font-semibold whitespace-nowrap"
                            >
                              {header || `Column ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {csvPreview.rows.map((cells, rowIdx) => (
                          <tr key={rowIdx} className="text-text">
                            {csvPreview.headers.map((_, colIdx) => (
                              <td
                                key={colIdx}
                                className="max-w-[180px] truncate px-3 py-1.5"
                              >
                                {cells[colIdx] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="paste-feedback-textarea"
                  className="text-[12px] font-semibold text-text"
                >
                  Paste feedback lines
                </label>
                <span className="text-[11px] font-medium tabular-nums text-text-muted">
                  {pastedLines.length}{" "}
                  {pastedLines.length === 1 ? "line" : "lines"} ready
                </span>
              </div>
              <textarea
                id="paste-feedback-textarea"
                aria-label="Pasted feedback lines"
                rows={7}
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setSubmitError(null);
                }}
                placeholder={
                  "Paste one feedback response per line...\nPricing tier comparison is confusing on mobile\nOnboarding checklist made setup super fast!"
                }
                className="w-full rounded-[8px] border border-border bg-canvas p-3 text-[13px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              />
              {pastedLines.length > 500 && (
                <p className="text-[12px] text-status-error">
                  Please split imports into batches of 500 lines or fewer.
                </p>
              )}
            </div>
          )}

          {/* Defaults & Target Form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="import-target-form"
                className="text-[12px] font-semibold text-text"
              >
                Target form
              </label>
              <select
                id="import-target-form"
                aria-label="Target form"
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="h-9 rounded-[8px] border border-border bg-canvas px-2.5 text-[12px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              >
                <option value="">Default active form</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="import-default-category"
                className="text-[12px] font-semibold text-text"
              >
                Fallback category
              </label>
              <select
                id="import-default-category"
                aria-label="Fallback category"
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
                className="h-9 rounded-[8px] border border-border bg-canvas px-2.5 text-[12px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              >
                <option value="">Auto-match keywords</option>
                {selectableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="import-default-rating"
                className="text-[12px] font-semibold text-text"
              >
                Default rating
              </label>
              <select
                id="import-default-rating"
                aria-label="Default rating"
                value={defaultRating}
                onChange={(e) => setDefaultRating(e.target.value)}
                className="h-9 rounded-[8px] border border-border bg-canvas px-2.5 text-[12px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              >
                <option value="">None (infer from text)</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>
          </div>

          {/* Inline Error Alert */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12px] text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Partial-Success Result Summary */}
          {importResult && (
            <div className="flex flex-col gap-2 rounded-[10px] border border-amber-200 bg-amber-50/70 p-3.5 text-[12px] dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 font-semibold text-text">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="tabular-nums">
                  Imported {importResult.imported_count} responses ·{" "}
                  {importResult.categorized_count} categorized ·{" "}
                  {importResult.skipped_count} skipped
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="flex max-h-28 flex-col gap-1 overflow-y-auto pl-6 text-[11px] text-rose-700 dark:text-rose-300 list-disc">
                  {importResult.errors.map((errItem) => (
                    <li key={`${errItem.row_number}-${errItem.reason}`}>
                      Row {errItem.row_number}: {errItem.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 rounded-[8px] border border-border bg-surface px-4 text-[13px] font-medium text-text transition-colors hover:bg-hover disabled:opacity-50"
            >
              {importResult && importResult.errors.length > 0 ? "Done" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-action px-4 text-[13px] font-medium text-white shadow-2xs transition-colors hover:bg-action/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  <span>Import responses</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
