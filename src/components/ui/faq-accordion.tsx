"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import type { PublicFaq } from "@/content/home";

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function FaqAccordion({ items }: { items: readonly PublicFaq[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const prefix = useId();
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowDown" ? (index + 1) % items.length
      : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (next !== null) { event.preventDefault(); buttons.current[next]?.focus(); }
  }

  return (
    <div className="faq-list" aria-busy={!ready}>
      {items.map((item, index) => {
        const expanded = open === item.id;
        const triggerId = `${prefix}-question-${index}`;
        const panelId = `${prefix}-answer-${index}`;
        return (
          <div className="faq-item" key={item.id}>
            <h3>
              <button
                ref={(element) => { buttons.current[index] = element; }}
                id={triggerId} type="button" className="faq-trigger"
                disabled={!ready}
                aria-expanded={expanded} aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : item.id)}
                onKeyDown={(event) => moveFocus(event, index)}
              >
                <span>{item.question}</span><Plus size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} className="faq-panel" role="region" aria-labelledby={triggerId} hidden={!expanded}>
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
