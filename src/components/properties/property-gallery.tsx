"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PropertyImageDTO } from "@/types/dto";

export function PropertyGallery({ images, title }: { images: PropertyImageDTO[]; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const show = (next: number) => setIndex((next + images.length) % images.length);

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "ArrowLeft") show(index - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <ImageOff className="size-10" aria-hidden="true" />
        <span className="sr-only">No photos yet</span>
      </div>
    );
  }

  const cover = images[0]!;
  const thumbnails = images.slice(1, 5);

  return (
    <>
      <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          className={cn("group relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted md:col-span-2 md:row-span-2 md:aspect-auto", thumbnails.length === 0 && "md:col-span-4")}
          aria-label="Open photo gallery"
        >
          <Image src={cover.url} alt={cover.alt ?? title} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </button>
        {thumbnails.map((image, thumbIndex) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setIndex(thumbIndex + 1);
              setOpen(true);
            }}
            className="group relative hidden aspect-[4/3] overflow-hidden rounded-2xl bg-muted md:block"
            aria-label={`Open photo ${thumbIndex + 2} of ${images.length}`}
          >
            <Image src={image.url} alt={image.alt ?? `${title} photo ${thumbIndex + 2}`} fill sizes="25vw" className="object-cover" />
            {thumbIndex === thumbnails.length - 1 && images.length > 5 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">+{images.length - 5} more</span>
            ) : null}
          </button>
        ))}
        <Button type="button" variant="secondary" size="sm" className="absolute right-6 bottom-6 hidden md:inline-flex" onClick={() => setOpen(true)}>
          <Expand /> All photos ({images.length})
        </Button>
        <Button type="button" variant="secondary" size="sm" className="md:hidden" onClick={() => setOpen(true)}>
          <Expand /> View all {images.length} photos
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(96vw,1200px)] border-none bg-black/95 p-2 text-white sm:max-w-[min(96vw,1200px)]" showCloseButton>
          <DialogTitle className="sr-only">
            {title} photo {index + 1} of {images.length}
          </DialogTitle>
          <div className="relative aspect-[16/10] w-full">
            <Image src={images[index]!.url} alt={images[index]!.alt ?? `${title} photo ${index + 1}`} fill sizes="96vw" className="object-contain" />
          </div>
          <div className="flex items-center justify-between px-2 pb-1 text-sm">
            <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => show(index - 1)} aria-label="Previous photo">
              <ChevronLeft />
            </Button>
            <span aria-live="polite">
              {index + 1} / {images.length}
              {images[index]!.alt ? <span className="ml-2 text-white/70">{images[index]!.alt}</span> : null}
            </span>
            <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => show(index + 1)} aria-label="Next photo">
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
