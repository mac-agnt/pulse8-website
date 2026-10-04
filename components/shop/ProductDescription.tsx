import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";
import type { ProductBlock } from "@/lib/shop";

type SpecRow = { label: string; value: string };

/**
 * Consecutive rows that share a label become one group, so a label shows once
 * above all of its values. The Mindray sheet repeats "Smartest", "Fastest"
 * and so on across rows; this reads it as one list per heading.
 */
function groupSpecs(rows: SpecRow[]): Array<{ label: string; values: string[] }> {
  const groups: Array<{ label: string; values: string[] }> = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.label === row.label) {
      last.values.push(row.value);
    } else {
      groups.push({ label: row.label, values: [row.value] });
    }
  }
  return groups;
}

function List({ items }: { items: string[] }) {
  // Long lists (kit contents, mostly) split into two columns from tablet up.
  return (
    <ul className={cn("grid gap-x-8 gap-y-2.5", items.length > 6 && "sm:grid-cols-2")}>
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-ink-muted">
          <Check size={15} weight="bold" className="mt-[0.3rem] shrink-0 text-accent" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Specs({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="divide-y divide-border-soft border-y border-border-soft">
      {groupSpecs(rows).map((group, index) => (
        // dt and its dds stay direct children of the div, as a dl requires; the
        // dds are pinned to the second column so they stack beside the label.
        <div
          key={`${group.label}-${index}`}
          className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-6 sm:gap-y-1.5"
        >
          <dt className="text-[0.9375rem] text-ink-faint">{group.label}</dt>
          {group.values.map((value, valueIndex) => (
            <dd
              key={valueIndex}
              className="text-[0.9375rem] leading-relaxed text-ink sm:col-start-2"
            >
              {value}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

/**
 * The product copy as ported from the old store: paragraphs, small headings,
 * bullet lists and specification rows, in their original order.
 */
export function ProductDescription({
  blocks,
  className,
}: {
  blocks: ProductBlock[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "p":
            return (
              <p key={index} className="leading-relaxed text-ink-muted">
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h3 key={index} className="pt-3 text-base font-semibold text-ink">
                {block.text}
              </h3>
            );
          case "list":
            return <List key={index} items={block.items} />;
          case "specs":
            return <Specs key={index} rows={block.rows} />;
        }
      })}
    </div>
  );
}
