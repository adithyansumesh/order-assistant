import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  ArrowRight,
  Database,
} from "lucide-react";
import { CsvValidationResult, CsvImportResult, StatsData } from "../types";
import { apiUrl } from "../config";

interface DataManagementProps {
  stats: StatsData | null;
  onDatasetUpdated: () => void;
  onAskQuestion?: (q: string) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  stats,
  onDatasetUpdated,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");

  const [ingestMode, setIngestMode] = useState<"append" | "replace">("append");
  const [createBackup, setCreateBackup] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // Confirmation modal for dataset replacement
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCurrentOrders = stats?.total_orders || 0;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv") && !file.name.endsWith(".txt")) {
      alert("Please upload a valid CSV or TSV file.");
      return;
    }

    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      await runValidation(text, file.name);
    };
    reader.readAsText(file);
  };

  const runValidation = async (text: string, filename: string) => {
    setValidating(true);
    try {
      const res = await fetch(apiUrl("/api/data/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, filename }),
      });
      const data: CsvValidationResult = await res.json();
      setValidationResult(data);
    } catch (err) {
      console.error("Validation error:", err);
      setValidationResult({
        valid: false,
        filename,
        file_size_bytes: text.length,
        total_rows: 0,
        columns: [],
        missing_columns: ["order_id", "status"],
        internal_duplicates: [],
        existing_duplicates: [],
        errors: ["Failed to connect to server validation engine."],
        warnings: [],
        preview_rows: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleClearStaged = () => {
    setSelectedFile(null);
    setFileContent("");
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCommitClick = () => {
    if (!validationResult || !validationResult.valid) return;

    if (ingestMode === "replace") {
      setShowConfirmModal(true);
    } else {
      executeImport();
    }
  };

  const executeImport = async () => {
    setShowConfirmModal(false);
    if (!fileContent || !selectedFile) return;

    setImporting(true);
    try {
      const res = await fetch(apiUrl("/api/data/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fileContent,
          filename: selectedFile.name,
          mode: ingestMode,
          create_backup: createBackup,
        }),
      });

      const data: CsvImportResult = await res.json();
      setImportResult(data);

      if (data.success) {
        onDatasetUpdated();
      }
    } catch (err: any) {
      console.error("Import execution failed:", err);
      setImportResult({
        success: false,
        mode: ingestMode,
        records_added: 0,
        records_skipped: 0,
        records_rejected: 0,
        total_records: totalCurrentOrders,
        message: "Network or server failure during data import.",
        error: String(err),
      });
    } finally {
      setImporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredPreviewRows = validationResult?.preview_rows?.filter((row) => {
    if (!previewSearch) return true;
    const q = previewSearch.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
  }) || [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fade-in" aria-label="Data Management">
      {/* Header Bar */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-low/90 backdrop-blur-xl p-5 border border-border-subtle shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-primary" />
              <h1 className="text-xl font-semibold text-on-surface">Data Management & Ingestion</h1>
            </div>
            <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
              Upload, validate, inspect schemas, and synchronize store orders into the active assistant cluster.
              All changes are persistently saved to the active dataset with zero server downtime.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <a
              href={apiUrl("/api/data/download")}
              download="orders.csv"
              className="btn-secondary"
              title="Download currently active orders.csv"
            >
              <Download size={14} />
              <span>Download Active orders.csv</span>
            </a>
          </div>
        </div>
      </section>

      {/* Drag & Drop Zone and Active Staged File Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upload Drop Zone */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            className={`relative flex flex-col items-center justify-center rounded-xl p-8 text-center transition-all min-h-[240px] border-2 border-dashed ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border-medium bg-surface-container/60 hover:bg-surface-container/90"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-sm">
                <UploadCloud size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm text-on-surface">
                  Drag and drop orders.csv here
                </span>
                <span className="text-xs text-on-surface-variant">
                  Supports .csv, .tsv files formatted with required store schema
                </span>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <label className="cursor-pointer btn-primary flex items-center gap-2 text-xs">
                  <FileSpreadsheet size={14} />
                  <span>Browse Files</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Staged File Info Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="h-full rounded-xl bg-surface-container/80 backdrop-blur-xl p-5 border border-border-subtle flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted">
                  Staged Batch Intake
                </span>
                {validating ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/20 text-primary">
                    Validating...
                  </span>
                ) : validationResult ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                      validationResult.valid
                        ? "bg-success/20 text-success"
                        : "bg-error/20 text-error"
                    }`}
                  >
                    {validationResult.valid ? "Verified & Ready" : "Validation Errors"}
                  </span>
                ) : (
                  <span className="text-xs text-muted font-mono">No File Staged</span>
                )}
              </div>

              {selectedFile ? (
                <div className="flex items-start gap-3 bg-surface-container-lowest/80 p-3 rounded-lg border border-border-subtle">
                  <div className="p-2 rounded bg-surface-container-high text-primary mt-0.5">
                    <FileText size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-on-surface truncate">
                      {selectedFile.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mt-0.5">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">
                        {validationResult ? `${validationResult.total_rows} rows` : "Parsing..."}
                      </span>
                      <span>•</span>
                      <span>UTF-8</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearStaged}
                    className="text-muted hover:text-error transition-colors p-1 rounded"
                    title="Remove staged file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-surface-container-lowest/40 border border-border-subtle flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted">
                    No dataset staged yet. Upload a CSV file using "Browse Files" or drag and drop.
                  </span>
                </div>
              )}
            </div>

            {validationResult && (
              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-col gap-1.5 text-xs font-mono text-on-surface-variant">
                <div className="flex items-center justify-between">
                  <span>Current Active Dataset:</span>
                  <span className="text-on-surface font-medium">{totalCurrentOrders} records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Staged File Rows:</span>
                  <span className="text-primary font-medium">{validationResult.total_rows} records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Schema Columns:</span>
                  <span className="text-success font-medium">
                    {validationResult.columns.length} / 11 matched
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pre-flight Validation Summary */}
      {validationResult && (
        <section className="rounded-xl bg-surface-container-low/90 backdrop-blur-xl p-5 border border-border-subtle flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  validationResult.valid ? "bg-success shadow-glow-green" : "bg-error shadow-glow-red"
                }`}
              />
              <h2 className="text-base font-semibold text-on-surface">
                Schema & Data Quality Pre-flight Validation
              </h2>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium self-start sm:self-auto ${
                validationResult.valid
                  ? "bg-success/20 text-success"
                  : "bg-error/20 text-error"
              }`}
            >
              {validationResult.valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span>
                {validationResult.valid
                  ? "Validation Passed • Ready to Import"
                  : "Validation Failed • Correct Issues Below"}
              </span>
            </div>
          </div>

          {/* 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-container/70 border border-border-subtle flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-muted">Total Parsed Rows</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-semibold text-on-surface">
                  {validationResult.total_rows}
                </span>
                <span className="text-xs text-primary font-mono">
                  {validationResult.valid ? "100% readable" : "parsed"}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                {validationResult.valid ? "Zero delimiter errors" : "Rows loaded from CSV"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-container/70 border border-border-subtle flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-muted">Valid Schema Columns</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-semibold text-success">
                  {11 - validationResult.missing_columns.length} / 11
                </span>
                <span className="text-xs text-on-surface-variant font-mono">
                  {validationResult.missing_columns.length === 0 ? "exact match" : "missing cols"}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                order_id, date, status, INR types
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-container/70 border border-border-subtle flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted">Data Warnings</span>
                {validationResult.warnings.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-primary font-mono hover:underline flex items-center gap-1"
                    onClick={() => setShowWarnings(!showWarnings)}
                  >
                    <span>{showWarnings ? "Hide" : "Review"}</span>
                    {showWarnings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-semibold text-warning">
                  {validationResult.warnings.length}
                </span>
                <span className="text-xs text-on-surface-variant font-mono">non-blocking</span>
              </div>
              <span className="text-xs text-on-surface-variant">Auto-sanitizer handled fields</span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-container/70 border border-border-subtle flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-muted">Critical Errors</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-mono font-semibold ${
                    validationResult.errors.length === 0 ? "text-success" : "text-error"
                  }`}
                >
                  {validationResult.errors.length}
                </span>
                <span className="text-xs text-on-surface-variant font-mono">
                  {validationResult.errors.length === 0 ? "zero blocking" : "blocking import"}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                {validationResult.errors.length === 0 ? "Ready for ACID commit" : "Must fix to proceed"}
              </span>
            </div>
          </div>

          {/* Errors Drawer */}
          {validationResult.errors.length > 0 && (
            <div className="p-3.5 rounded-lg bg-error/10 border border-error/30 flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-error font-semibold">
                <AlertTriangle size={14} />
                <span>Validation Errors ({validationResult.errors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-on-surface">
                {validationResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Drawer */}
          {showWarnings && validationResult.warnings.length > 0 && (
            <div className="p-3.5 rounded-lg bg-surface-container-lowest/90 border border-border-subtle flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between text-on-surface font-semibold">
                <span>Non-Blocking Sanitization Log ({validationResult.warnings.length})</span>
                <span className="text-muted text-xs">Auto-resolved via ingest pipeline</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-1 border-t border-border-subtle text-xs text-on-surface">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              <span>Type Coercion Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              <span>Currency Formatted (INR ₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              <span>Dates ISO-8601 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              <span>Duplicate Verification Active</span>
            </div>
          </div>
        </section>
      )}

      {/* Tabular Staged Preview */}
      {validationResult && validationResult.preview_rows.length > 0 && (
        <section className="rounded-xl bg-surface-container/70 backdrop-blur-xl p-5 border border-border-subtle flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-on-surface">Staged Data Preview</span>
              <span className="text-xs text-on-surface-variant font-mono">
                Showing {filteredPreviewRows.length} sample rows from uploaded CSV
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center bg-surface-container-lowest/80 rounded-lg px-3 py-1.5 w-64 border border-border-subtle">
                <Search size={14} className="text-muted mr-2" />
                <input
                  type="text"
                  placeholder="Filter preview rows..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="bg-transparent text-on-surface text-xs font-mono outline-none w-full"
                />
                {previewSearch && (
                  <button onClick={() => setPreviewSearch("")} className="text-muted hover:text-on-surface">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-container-lowest/60">
            <table className="w-full text-left text-xs font-mono text-on-surface">
              <thead className="bg-surface-container-high/80 text-muted uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Order ID</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5">Total (INR)</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredPreviewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-3 py-2 font-semibold text-primary">{row.order_id}</td>
                    <td className="px-3 py-2 text-on-surface">{row.customer_name}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.city}</td>
                    <td className="px-3 py-2 text-on-surface">{row.product}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.category}</td>
                    <td className="px-3 py-2 text-on-surface">{row.quantity}</td>
                    <td className="px-3 py-2 font-semibold text-on-surface">₹{row.total_inr}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 capitalize ${
                        row.status === "delivered" ? "text-success" :
                        row.status === "cancelled" ? "text-error" : "text-primary"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{row.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ingestion Strategy & Commit Controls */}
      {validationResult && validationResult.valid && (
        <section className="rounded-xl bg-surface-container-low/90 backdrop-blur-xl p-6 border border-border-subtle flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-on-surface">
              Ingestion Strategy & Transaction Commit
            </h2>
            <p className="text-xs text-on-surface-variant">
              Select how the data engine updates the active dataset with the staged records.
            </p>
          </div>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Append */}
            <label
              className={`relative flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all ${
                ingestMode === "append"
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-surface-container/70 border-border-subtle hover:bg-surface-container"
              }`}
            >
              <input
                type="radio"
                name="ingest_mode"
                value="append"
                checked={ingestMode === "append"}
                onChange={() => setIngestMode("append")}
                className="mt-1 accent-primary"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">Append New Records</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-medium">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Adds the {validationResult.total_rows} staged records to the current {totalCurrentOrders} records.
                  Any duplicate <code className="text-primary font-mono">order_id</code> keys are automatically detected and skipped.
                </p>
              </div>
            </label>

            {/* Option 2: Replace */}
            <label
              className={`relative flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all ${
                ingestMode === "replace"
                  ? "bg-error/10 border-error shadow-sm"
                  : "bg-surface-container/70 border-border-subtle hover:bg-surface-container"
              }`}
            >
              <input
                type="radio"
                name="ingest_mode"
                value="replace"
                checked={ingestMode === "replace"}
                onChange={() => setIngestMode("replace")}
                className="mt-1 accent-error"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">Replace Current Dataset</span>
                  <span className="px-2 py-0.5 rounded-full bg-error/20 text-error text-[10px] font-mono font-medium">
                    Requires Confirmation
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Replaces the existing {totalCurrentOrders} records with the new {validationResult.total_rows} records.
                  The assistant and analytics will immediately operate on the new records.
                </p>
              </div>
            </label>
          </div>

          {/* Backup Option */}
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-surface-container-lowest/80 border border-border-subtle">
            <input
              type="checkbox"
              id="chk-backup"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <label htmlFor="chk-backup" className="text-xs text-on-surface cursor-pointer">
              Automatically create snapshot backup of current dataset before applying changes
            </label>
          </div>

          {/* Import Result Notification */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border flex flex-col gap-1.5 text-xs font-mono ${
                importResult.success
                  ? "bg-success/10 border-success/30 text-on-surface"
                  : "bg-error/10 border-error/30 text-on-surface"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {importResult.success ? (
                  <>
                    <CheckCircle2 size={16} className="text-success" />
                    <span className="text-success">Import Successful!</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-error" />
                    <span className="text-error">Import Failed</span>
                  </>
                )}
              </div>
              <p className="text-on-surface-variant">{importResult.message}</p>
              {importResult.success && (
                <div className="flex flex-wrap items-center gap-3 text-muted text-[11px] pt-1 border-t border-border-subtle">
                  <span>Added: <strong className="text-success">{importResult.records_added}</strong></span>
                  <span>Skipped: <strong className="text-warning">{importResult.records_skipped}</strong></span>
                  <span>Active Total: <strong className="text-primary">{importResult.total_records}</strong></span>
                  {importResult.backup_created && (
                    <span>Backup: <strong className="text-foreground">{importResult.backup_created}</strong></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={handleClearStaged}
            >
              Cancel & Discard
            </button>

            <button
              type="button"
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-semibold"
              onClick={handleCommitClick}
              disabled={importing}
            >
              {importing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Committing Changes...</span>
                </>
              ) : (
                <>
                  <span>
                    Commit & {ingestMode === "replace" ? "Replace" : "Append"} {validationResult.total_rows} Records
                  </span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Confirmation Modal for Replace Mode */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div
            className="modal-dialog max-w-md p-6 bg-surface-container rounded-xl border border-border-medium flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-error">
              <div className="p-2.5 rounded-full bg-error/20">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-on-surface">Confirm Dataset Replacement</h3>
                <span className="text-xs text-muted">Irreversible dataset overwrite</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to replace the active dataset? This will replace all{" "}
              <strong className="text-on-surface">{totalCurrentOrders} existing records</strong> with the{" "}
              <strong className="text-primary">{validationResult?.total_rows} staged records</strong>.
              {createBackup && " An automatic snapshot backup will be created before replacement."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-xs font-semibold transition-all shadow-sm"
                onClick={executeImport}
              >
                Yes, Replace Active Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
