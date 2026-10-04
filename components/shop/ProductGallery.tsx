"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Product photographs: one large square on white, thumbnails underneath when
 * there is more than one shot.
 *
 * Every image is mounted and stacked, and switching only crossfades opacity,
 * so a change of picture never waits on a network request or shifts layout.
 */
export function ProductGallery({
  images,
  name,
  className,
}: {
  images: string[];
  name: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const total = images.length;

  return (
    <div className={className}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        {images.map((src, index) => (
          <div
            key={src}
            aria-hidden={index !== active}
            className={cn(
              "absolute inset-6 transition-opacity duration-500 ease-out sm:inset-10",
              index === active ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={src}
              alt={index === 0 ? name : `${name}, image ${index + 1} of ${total}`}
              fill
              preload={index === 0}
              sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 92vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      {total > 1 ? (
        <div role="group" aria-label="Product images" className="mt-3 flex flex-wrap gap-3">
          {images.map((src, index) => {
            const current = index === active;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${total}`}
                aria-pressed={current}
                className={cn(
                  "relative size-18 overflow-hidden rounded-[var(--radius-control)] border bg-surface transition-colors duration-200 sm:size-20",
                  current
                    ? "border-accent ring-1 ring-accent ring-inset"
                    : "border-border hover:border-ink-faint",
                )}
              >
                <span className="absolute inset-2">
                  <Image src={src} alt="" fill sizes="80px" className="object-contain" />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
