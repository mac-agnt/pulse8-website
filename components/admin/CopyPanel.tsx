"use client";

import type { SiteContent } from "@/lib/content";
import { Card, Field, TextArea, TextInput } from "@/components/admin/Field";

/**
 * Site copy.
 *
 * The three blocks a non-technical editor actually changes: the hero, the
 * numbers band and the booking steps. Each field maps one to one onto what is
 * rendered, so there is nothing to guess.
 */
export function CopyPanel({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (next: Partial<SiteContent>) => void;
}) {
  const { hero, facts, process } = content;

  return (
    <div className="flex flex-col gap-5">
      <Card id="copy-hero" title="Hero" description="The first screen of the home page">
        <div className="flex flex-col gap-5">
          <Field label="Eyebrow" hint="The small pill above the headline">
            <TextInput
              value={hero.eyebrow}
              onChange={(event) => onChange({ hero: { ...hero, eyebrow: event.target.value } })}
            />
          </Field>
          <Field label="Headline" hint="Two lines at most. No exclamation marks.">
            <TextInput
              value={hero.headline}
              onChange={(event) => onChange({ hero: { ...hero, headline: event.target.value } })}
            />
          </Field>
          <Field label="Sub-headline" hint="Around twenty words">
            <TextArea
              value={hero.subline}
              onChange={(event) => onChange({ hero: { ...hero, subline: event.target.value } })}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Primary button">
              <TextInput
                value={hero.primaryCta}
                onChange={(event) =>
                  onChange({ hero: { ...hero, primaryCta: event.target.value } })
                }
              />
            </Field>
            <Field label="Secondary button">
              <TextInput
                value={hero.secondaryCta}
                onChange={(event) =>
                  onChange({ hero: { ...hero, secondaryCta: event.target.value } })
                }
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card id="copy-numbers" title="Numbers" description="The four figures under the courses grid">
        <div className="flex flex-col gap-5">
          {facts.map((fact, index) => (
            <div
              key={index}
              className="grid gap-4 border-b border-border pb-5 last:border-0 last:pb-0 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <Field label={index === 0 ? "Figure" : ""}>
                <TextInput
                  value={fact.value}
                  onChange={(event) =>
                    onChange({
                      facts: facts.map((item, i) =>
                        i === index ? { ...item, value: event.target.value } : item,
                      ),
                    })
                  }
                />
              </Field>
              <Field label={index === 0 ? "Label" : ""}>
                <TextInput
                  value={fact.label}
                  onChange={(event) =>
                    onChange({
                      facts: facts.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item,
                      ),
                    })
                  }
                />
              </Field>
              <Field label={index === 0 ? "Note" : ""}>
                <TextInput
                  value={fact.note}
                  onChange={(event) =>
                    onChange({
                      facts: facts.map((item, i) =>
                        i === index ? { ...item, note: event.target.value } : item,
                      ),
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      </Card>

      <Card id="copy-steps" title="Booking steps" description="The three steps beside the numbers band">
        <div className="flex flex-col gap-5">
          <Field label="Section heading">
            <TextInput
              value={process.heading}
              onChange={(event) =>
                onChange({ process: { ...process, heading: event.target.value } })
              }
            />
          </Field>
          {process.steps.map((step, index) => (
            <div key={index} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Field label={`Step ${index + 1} title`}>
                <TextInput
                  value={step.title}
                  onChange={(event) =>
                    onChange({
                      process: {
                        ...process,
                        steps: process.steps.map((item, i) =>
                          i === index ? { ...item, title: event.target.value } : item,
                        ),
                      },
                    })
                  }
                />
              </Field>
              <Field label={`Step ${index + 1} body`}>
                <TextArea
                  className="min-h-20"
                  value={step.body}
                  onChange={(event) =>
                    onChange({
                      process: {
                        ...process,
                        steps: process.steps.map((item, i) =>
                          i === index ? { ...item, body: event.target.value } : item,
                        ),
                      },
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
