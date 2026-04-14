"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ImagePlus, Upload, X, Loader2 } from "lucide-react";
import { NodeShell } from "./node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import { uploadToTransloadit } from "@/lib/transloadit";
import { toast } from "sonner";

const ACCEPTED_IMAGE_TYPES = ".jpg,.jpeg,.png,.webp,.gif";

function UploadImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const url = await uploadToTransloadit(file, "image");
        updateNodeData(id, { imageUrl: url, fileName: file.name });
        toast.success(`Image uploaded: ${file.name}`);
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [id, updateNodeData]
  );

  const clearImage = useCallback(() => {
    updateNodeData(id, { imageUrl: null, fileName: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [id, updateNodeData]);

  const imageUrl = data.imageUrl as string | null;

  return (
    <NodeShell
      color="#3B82F6"
      label="Upload Image"
      icon={<ImagePlus className="h-3.5 w-3.5" />}
      isSelected={selected}
      isRunning={data.isRunning as boolean}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt={data.fileName as string}
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: 200 }}
          />
          <button
            onClick={clearImage}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 transition-colors hover:bg-black/80"
          >
            <X className="h-3 w-3 text-white" />
          </button>
          <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
            {data.fileName as string}
          </p>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-input py-8 transition-colors hover:border-blue-500/50 hover:bg-accent disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isUploading ? "Uploading..." : "Select asset"}
          </span>
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!-right-[5px] !top-1/2 !h-2.5 !w-2.5 !border-2 !border-blue-500 !bg-card"
      />
    </NodeShell>
  );
}

export const UploadImageNode = memo(UploadImageNodeComponent);
