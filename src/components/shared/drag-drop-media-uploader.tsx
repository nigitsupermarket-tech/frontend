"use client";

import { useState, useId } from "react";
import {
  Loader2,
  Trash2,
  GripVertical,
  Upload,
  Video,
  Plus,
  X,
} from "lucide-react";
import { apiUpload, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import Image from "next/image";

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

interface DragDropMediaUploaderProps {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxFiles?: number;
  folder?: string;
  accept?: "image" | "video" | "both";
  label?: string;
  helperText?: string;
  showPreview?: boolean;
}

export function DragDropMediaUploader({
  value = [],
  onChange,
  maxFiles = 10,
  folder = "general",
  accept = "image",
  label = "Media",
  helperText,
  showPreview = true,
}: DragDropMediaUploaderProps) {
  // ✅ FIX: useId() generates a unique ID per component instance
  // Previously all uploaders shared the same `id="file-upload"` so clicking
  // the label in uploader #2 triggered uploader #1's hidden input
  const uid = useId();
  const inputId = `file-upload-${uid}`;

  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const toast = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast(`Maximum ${maxFiles} files allowed`, "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("folder", folder);
      Array.from(files).forEach((file) => {
        formData.append("images", file);
      });

      const res = await apiUpload<any>("/upload/images", formData);
      const newItems: MediaItem[] = res.data.images.map((img: any) => ({
        url: img.url,
        publicId: img.publicId,
        type: "image" as const,
        width: img.width,
        height: img.height,
      }));

      onChange([...value, ...newItems]);
      toast("Files uploaded successfully", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const isVideo =
      /\.(mp4|webm|ogg|mov)$/i.test(urlInput) ||
      urlInput.includes("youtube.com") ||
      urlInput.includes("vimeo.com") ||
      urlInput.includes("youtu.be");

    const newItem: MediaItem = {
      url: urlInput.trim(),
      type: isVideo ? "video" : "image",
    };

    onChange([...value, newItem]);
    setUrlInput("");
    toast("URL added", "success");
  };

  const handleRemove = async (index: number) => {
    const item = value[index];
    if (item.publicId) {
      try {
        await apiDelete("/upload", { publicId: item.publicId });
      } catch (err) {
        console.error("Failed to delete from Cloudinary:", err);
      }
    }
    onChange(value.filter((_, i) => i !== index));
    toast("Item removed", "success");
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newItems = [...value];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    onChange(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const acceptTypes =
    accept === "both"
      ? "image/*,video/*"
      : accept === "video"
        ? "video/*"
        : "image/*";

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {maxFiles > 1 && (
            <span className="ml-2 text-xs text-gray-500">
              ({value.length}/{maxFiles})
            </span>
          )}
        </label>
      )}

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          uploading
            ? "border-brand-300 bg-brand-50"
            : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"
        }`}
      >
        {/* ✅ FIX: id and htmlFor now use the unique inputId */}
        <input
          type="file"
          id={inputId}
          multiple={maxFiles > 1}
          accept={acceptTypes}
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={uploading || value.length >= maxFiles}
          className="hidden"
        />

        <label
          htmlFor={inputId}
          className={`cursor-pointer ${uploading || value.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          )}
          <p className="text-sm font-medium text-gray-700 mb-1">
            {uploading ? "Uploading..." : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-gray-500">
            {accept === "both"
              ? "Images or Videos"
              : accept === "video"
                ? "MP4, WebM, OGG up to 50MB"
                : "PNG, JPG, GIF up to 5MB"}
          </p>
        </label>
      </div>

      {/* Add URL Input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
          placeholder={
            accept === "video"
              ? "Or paste video URL (YouTube, Vimeo, direct link)"
              : "Or paste image URL"
          }
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={handleUrlAdd}
          disabled={!urlInput.trim()}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Grid */}
      {showPreview && value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-move ${
                draggedIndex === index
                  ? "border-brand-500 opacity-50 scale-95"
                  : "border-gray-200 hover:border-brand-300"
              }`}
            >
              <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-white" />
              </div>

              {index === 0 && (
                <span className="absolute top-2 left-10 bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded font-medium z-10">
                  Main
                </span>
              )}

              <span className="absolute top-2 right-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-medium z-10">
                {item.type === "video" ? "Video" : "Image"}
              </span>

              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>

              {item.type === "video" ? (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <Video className="w-8 h-8 text-gray-400" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 truncate">
                    {item.url.split("/").pop()?.substring(0, 20)}...
                  </div>
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={500}
                  height={500}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
