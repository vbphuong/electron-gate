"use client";

import * as React from "react";
import { UploadCloud, X, File as FileIcon, CheckCircle2, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  errorMessage?: string;
  totalPages?: number;
  totalChunks?: number;
}

interface FileUploadCardProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  files: UploadedFile[];
  onFilesChange: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onClose?: () => void;
  accept?: string;
  maxSizeBytes?: number;
  subtitle?: string;
  allowedFormatsText?: string;
}

export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
  (
    {
      className,
      files = [],
      onFilesChange,
      onFileRemove,
      onClose,
      accept = ".pdf,.docx,.txt,.csv,.json,.png,.jpg,.jpeg",
      maxSizeBytes = 50 * 1024 * 1024,
      subtitle = "Select and upload documents to parse, chunk, and embed for vector search",
      allowedFormatsText = "PDF, DOCX, TXT, CSV, JSON, PNG, JPEG formats, up to 50 MB.",
      ...props
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles && droppedFiles.length > 0) {
        onFilesChange(droppedFiles);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesChange(selectedFiles);
      }
      if (e.target) {
        e.target.value = "";
      }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 KB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileExt = (filename: string, mimeType: string) => {
      const ext = filename.split(".").pop();
      if (ext && ext.length <= 4) return ext.toUpperCase();
      const mimeExt = mimeType.split("/")[1];
      return (mimeExt || "DOC").substring(0, 4).toUpperCase();
    };

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    const fileItemVariants = {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0 },
    };

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3 }}
        className={cn(
          "w-full bg-background rounded-xl border shadow-sm",
          className
        )}
        {...props}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-muted">
                <UploadCloud className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Upload documents</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label="Close upload card"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              "mt-6 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors duration-200 cursor-pointer select-none",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={handleFileSelect}
            />
            <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-semibold text-foreground">Choose a file or drag & drop it here</p>
            <p className="text-xs text-muted-foreground mt-1">
              {allowedFormatsText}
            </p>
            <Button variant="outline" size="sm" className="mt-4 pointer-events-none">
              Browse Files
            </Button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                Uploading &amp; Ingestion Queue ({files.length})
              </span>
              <span className="text-xs font-mono text-primary font-medium">
                {files.filter((f) => f.status === "completed").length} / {files.length} Done
              </span>
            </div>
            <ul className="space-y-4">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/40"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-md bg-muted text-xs font-bold text-primary font-mono border border-border">
                        {getFileExt(file.file.name, file.file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={file.file.name}>
                          {file.file.name}
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                          {file.status === "uploading" && (
                            <span>
                              {formatFileSize((file.file.size * file.progress) / 100)} of {formatFileSize(file.file.size)}
                            </span>
                          )}
                          {file.status === "completed" && (
                            <span>{formatFileSize(file.file.size)}</span>
                          )}
                          {file.status === "error" && (
                            <span>{formatFileSize(file.file.size)}</span>
                          )}
                          <span className="opacity-40">•</span>
                          <span
                            className={cn(
                              "font-mono font-medium",
                              { "text-primary": file.status === "uploading" },
                              { "text-green-500": file.status === "completed" },
                              { "text-red-400": file.status === "error" }
                            )}
                          >
                            {file.status === "uploading"
                              ? file.progress < 100
                                ? `Uploading ${file.progress}%`
                                : "Processing vectors..."
                              : file.status === "completed"
                              ? "Embedded & Synced"
                              : "Upload failed"}
                          </span>
                          {file.totalChunks !== undefined && file.totalChunks > 0 && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="text-cyan-400 font-mono text-[11px]">
                                {file.totalChunks} chunks
                              </span>
                            </>
                          )}
                          {file.errorMessage && (
                            <p className="text-[11px] text-red-400 w-full mt-0.5 truncate" title={file.errorMessage}>
                              {file.errorMessage}
                            </p>
                          )}
                        </div>
                        {file.status === "uploading" && (
                          <Progress value={file.progress} className="h-1.5 mt-2 bg-muted-foreground/20" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.status === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onFileRemove(file.id)}
                        aria-label="Remove file"
                      >
                        {file.status === "completed" ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </motion.div>
    );
  }
);
FileUploadCard.displayName = "FileUploadCard";
