import Image from "next/image";
import { cn } from "@/lib/cn";
import { phecc } from "@/lib/brand";

/**
 * PHECC's mark with the text its policy prescribes (Appendix 1 of POL007),
 * linked to phecc.ie. See lib/brand.ts for the rules.
 *
 * One unit on a white plate, so the full-colour artwork keeps its colours and
 * contrast on a photograph or a dark ground, and the text can never be
 * separated from it. The artwork is only ever scaled by height with its own
 * ratio (no crop, no filter). Kept small on purpose: never the dominant logo.
 */
export function PhecMark({ className }: { className?: string }) {
  return (
    <a
      href={phecc.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${phecc.institution}, recognised by PHECC at the level of ${phecc.level}, ${phecc.year}. Opens phecc.ie`}
      className={cn(
        "inline-flex items-center gap-3 rounded-[var(--radius-control)] bg-white px-3 py-2 text-[#0f172a] transition-shadow duration-200 hover:shadow-[0_0_0_2px_rgb(255_255_255/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      <Image
        src={phecc.mark.src}
        alt=""
        width={phecc.mark.width}
        height={phecc.mark.height}
        className="h-9 w-auto shrink-0"
      />
      <span className="text-[0.6875rem] leading-[1.3]">
        <span className="block font-semibold">{phecc.institution}</span>
        <span className="block">Recognised at level of {phecc.level}</span>
        <span className="figure block">{phecc.year}</span>
      </span>
    </a>
  );
}
