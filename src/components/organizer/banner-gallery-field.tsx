"use client"

import * as React from "react"
import { Loader, Star, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Multi-banner gallery uploader. Value is an ORDERED list of image URLs where
// index 0 is the "main" banner (drives the blurred hero backdrop + every
// legacy banner_url reader). "Set as main" moves an image to the front; the
// consumer event page cycles through all of them while keeping the main one's
// blur backdrop fixed.
//
// Uploads reuse the existing single-image /upload-banner endpoint (a generic
// image-in / URL-out uploader), called once per selected file.
export function BannerGalleryField({
  value,
  onChange,
  disabled = false,
  max = 8,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  disabled?: boolean
  max?: number
}) {
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const remaining = Math.max(0, max - value.length)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setError("")

    const picked = files.slice(0, remaining)
    if (files.length > remaining) {
      setError(`You can add up to ${max} banners. Extra files were skipped.`)
    }

    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          setError("Please select image files only (PNG, JPG, WebP…).")
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setError("Each image must be under 5 MB.")
          continue
        }
        const fd = new FormData()
        fd.append("image", file)
        const res = await fetch(`${API_URL}/api/organizer/events/upload-banner`, {
          method: "POST",
          credentials: "include",
          body: fd,
        })
        const data = await res.json()
        if (!data?.success) throw new Error(data?.message || "Upload failed.")
        uploaded.push(data.data.url)
      }
      if (uploaded.length) onChange([...value, ...uploaded])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const setMain = (idx: number) => {
    if (idx === 0) return
    const next = value.slice()
    const [picked] = next.splice(idx, 1)
    next.unshift(picked)
    onChange(next)
  }

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {/* Upload zone — hidden multi-file input inside an accessible label. */}
      <label
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          disabled || remaining === 0
            ? "cursor-not-allowed border-border opacity-60"
            : uploading
              ? "cursor-wait border-primary/60"
              : "cursor-pointer border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          title="Upload banner images"
          aria-label="Upload banner images"
          className="hidden"
          onChange={handleFiles}
          disabled={disabled || uploading || remaining === 0}
        />
        {uploading ? (
          <>
            <Loader className="h-7 w-7 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-primary/40" />
            <span className="text-sm font-semibold text-primary">
              {value.length === 0 ? "Click to upload banners" : "Add more banners"}
            </span>
            <span className="text-xs text-muted-foreground">
              PNG, JPG, WebP · max 5 MB each · up to {max} images
              {remaining === 0 ? " (limit reached)" : ""}
            </span>
          </>
        )}
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {value.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            The <span className="font-medium text-foreground">main</span> banner
            (starred) is shown first and sets the page background. Use{" "}
            <span className="font-medium text-foreground">Set as main</span> to
            change it.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((url, idx) => {
              const isMain = idx === 0
              return (
                <div
                  key={url}
                  className={cn(
                    "group relative aspect-video overflow-hidden rounded-lg border bg-muted",
                    isMain ? "border-primary ring-1 ring-primary" : "border-border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={isMain ? "Main banner" : `Banner ${idx + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />

                  {isMain && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                      <Star className="h-3 w-3 fill-current" />
                      Main
                    </span>
                  )}

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      title="Remove banner"
                      aria-label="Remove banner"
                      className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {!disabled && !isMain && (
                    <button
                      type="button"
                      onClick={() => setMain(idx)}
                      className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                    >
                      Set as main
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
