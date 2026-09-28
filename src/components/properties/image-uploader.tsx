"use client";

import * as React from "react";
import Image from "next/image";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, MAX_PROPERTY_IMAGES } from "@/lib/constants";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import type { PropertyImageInput } from "@/validations/property";

interface ImageUploaderProps {
  images: PropertyImageInput[];
  onChange: (images: PropertyImageInput[]) => void;
  disabled?: boolean;
}

interface PendingUpload {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

function SortableImage({ image, index, onRemove, onAltChange, onMakeCover, disabled }: {
  image: PropertyImageInput;
  index: number;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
  onMakeCover: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.storageKey, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} className={cn("flex flex-col gap-2 rounded-lg border bg-card p-2", isDragging && "z-10 shadow-lg ring-2 ring-ring")}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
        <Image src={image.url} alt={image.alt ?? `Photo ${index + 1}`} fill sizes="240px" className="object-cover" />
        {index === 0 ? (
          <span className="absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Cover</span>
        ) : null}
        <button
          type="button"
          className="absolute top-2 right-2 flex size-7 cursor-grab items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm active:cursor-grabbing"
          aria-label={`Drag to reorder photo ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <Input value={image.alt ?? ""} onChange={(event) => onAltChange(event.target.value)} placeholder="Describe this photo (alt text)" aria-label={`Alt text for photo ${index + 1}`} className="h-8 text-xs" />
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onMakeCover} disabled={index === 0 || disabled}>
          <Star /> Make cover
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove photo ${index + 1}`} disabled={disabled}>
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </li>
  );
}

export function ImageUploader({ images, onChange, disabled }: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingUpload[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const remaining = MAX_PROPERTY_IMAGES - images.length - pending.length;
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more photo${remaining === 1 ? "" : "s"} (max ${MAX_PROPERTY_IMAGES}).`);
      files.splice(remaining);
    }
    const accepted = files.filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
        toast.error(`${file.name}: only JPEG, PNG, WebP or AVIF images are allowed.`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`${file.name}: images must be under 8 MB.`);
        return false;
      }
      return true;
    });

    const uploads = accepted.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, progress: 0 }));
    setPending((current) => [...current, ...uploads]);

    let latest = images;
    await Promise.all(
      accepted.map(async (file, index) => {
        const uploadId = uploads[index]!.id;
        try {
          const result = await uploadFile(file, "property", (progress) => {
            setPending((current) => current.map((entry) => (entry.id === uploadId ? { ...entry, progress } : entry)));
          });
          latest = [...latest, { url: result.url, storageKey: result.storageKey, alt: "", width: result.width ?? null, height: result.height ?? null }];
          onChange(latest);
          setPending((current) => current.filter((entry) => entry.id !== uploadId));
        } catch (error) {
          setPending((current) => current.map((entry) => (entry.id === uploadId ? { ...entry, error: (error as Error).message } : entry)));
        }
      }),
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = images.findIndex((image) => image.storageKey === active.id);
    const to = images.findIndex((image) => image.storageKey === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(images, from, to));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Add photos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled) void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring",
          dragOver && "border-primary bg-accent/60",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Drag photos here or click to browse</p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or AVIF · up to 8 MB each · {images.length}/{MAX_PROPERTY_IMAGES} added
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
          disabled={disabled}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {pending.map((upload) => (
            <li key={upload.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              {upload.error ? null : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1 truncate">{upload.name}</span>
              {upload.error ? (
                <span className="flex items-center gap-2 text-destructive">
                  {upload.error}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPending((current) => current.filter((entry) => entry.id !== upload.id))}>
                    Dismiss
                  </Button>
                </span>
              ) : (
                <span className="text-muted-foreground">{upload.progress}%</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {images.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((image) => image.storageKey)} strategy={rectSortingStrategy}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Uploaded photos (drag to reorder, first photo is the cover)">
              {images.map((image, index) => (
                <SortableImage
                  key={image.storageKey}
                  image={image}
                  index={index}
                  disabled={disabled}
                  onRemove={() => onChange(images.filter((entry) => entry.storageKey !== image.storageKey))}
                  onAltChange={(alt) => onChange(images.map((entry) => (entry.storageKey === image.storageKey ? { ...entry, alt } : entry)))}
                  onMakeCover={() => onChange(arrayMove(images, index, 0))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
}
