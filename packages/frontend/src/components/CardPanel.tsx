import { useState } from "react";
import type {
  ConceptCard,
  PolicyCard,
  CardRegistry,
  ObligationType,
  AuthorityTier,
} from "../types/cards.ts";
import type { ScaffoldData } from "../types.ts";
import { getCardsForActivity } from "../types/cards.ts";
import { humanizeId } from "../lib/humanize-id.ts";

/* ── Authority Tier Badge ─────────────────────────────────────────── */

const TIER_STYLES: Record<AuthorityTier, string> = {
  policy:     "bg-red-100 text-red-700 border-red-200",
  procedure:  "bg-amber-100 text-amber-700 border-amber-200",
  guidance:   "bg-blue-100 text-blue-700 border-blue-200",
  workaround: "bg-gray-100 text-gray-600 border-gray-200",
};

function TierBadge({ tier }: { tier: AuthorityTier }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

/* ── Obligation Colour ────────────────────────────────────────────── */

const OBLIG_STYLES: Record<ObligationType, { dot: string; text: string; label: string }> = {
  permit:   { dot: "bg-green-500", text: "text-green-700", label: "Permit" },
  obligate: { dot: "bg-blue-500",  text: "text-blue-700",  label: "Obligate" },
  prohibit: { dot: "bg-red-500",   text: "text-red-700",   label: "Prohibit" },
};

/* ── Concept Card Display ─────────────────────────────────────────── */

function ConceptCardBlock({ card }: { card: ConceptCard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-sky-50/80 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span className="text-xs font-semibold text-sky-800">{card.canonicalName}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-500">{card.owner}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-mono text-sky-600">
            {card.tokenBudget} tok
          </span>
          <svg
            className={`h-3 w-3 text-sky-400 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-sky-200 px-3 py-2.5 space-y-3">
          {/* Description */}
          <p className="text-[10px] leading-relaxed text-gray-700">{card.description}</p>

          {/* Senses */}
          {card.senses.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-sky-500 mb-1">
                Senses ({card.senses.length})
              </p>
              <div className="space-y-1.5">
                {card.senses.map((sense) => (
                  <div key={sense.senseName} className="rounded border border-sky-100 bg-white px-2 py-1.5">
                    <p className="text-[10px] font-semibold text-sky-700">{sense.senseName}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{sense.description}</p>
                    {sense.systemOfRecord && (
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        SoR: <span className="font-medium text-gray-500">{sense.systemOfRecord}</span>
                      </p>
                    )}
                    {sense.disambiguationCues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sense.disambiguationCues.map((cue) => (
                          <span key={cue} className="rounded bg-sky-50 px-1.5 py-0.5 text-[8px] text-sky-600">
                            {cue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {card.relationships.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-sky-500 mb-1">
                Relationships
              </p>
              <div className="space-y-0.5">
                {card.relationships.map((rel, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-mono text-gray-500">
                      {rel.type}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="font-medium text-sky-700">{rel.targetCardId}</span>
                    {rel.label && <span className="text-gray-400">({rel.label})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provenance */}
          <div className="border-t border-sky-100 pt-2">
            <p className="text-[9px] text-gray-400">
              <span className="font-medium">Provenance:</span> {card.provenance}
            </p>
            {card.dataAcquisitionPlan && (
              <p className="text-[9px] text-gray-400 mt-0.5">
                <span className="font-medium">Data Acquisition:</span> {card.dataAcquisitionPlan}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Policy Card Display ──────────────────────────────────────────── */

function PolicyCardBlock({ card }: { card: PolicyCard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/40 overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-rose-50/80 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-rose-800">{card.name}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-500">{card.ownership}</p>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier={card.authorityTier} />
          <svg
            className={`h-3 w-3 text-rose-400 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-rose-200 px-3 py-2.5 space-y-3">
          {/* Description */}
          <p className="text-[10px] leading-relaxed text-gray-700">{card.description}</p>

          {/* Scope */}
          {card.scope && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-1">Scope</p>
              <div className="flex flex-wrap gap-1">
                {card.scope.channel && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-600">
                    Channel: {card.scope.channel}
                  </span>
                )}
                {card.scope.jurisdiction && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-600">
                    Jurisdiction: {card.scope.jurisdiction}
                  </span>
                )}
                {card.scope.product && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-600">
                    Product: {card.scope.product}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Conditions */}
          {card.conditions.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                Conditions
              </p>
              <div className="space-y-1">
                {card.conditions.map((cond, i) => (
                  <div key={i} className="rounded border border-rose-100 bg-white px-2 py-1.5">
                    <p className="text-[10px] font-mono text-gray-700">{cond.expression}</p>
                    {cond.referencedSenses && cond.referencedSenses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cond.referencedSenses.map((s) => (
                          <span key={s} className="rounded bg-sky-50 px-1.5 py-0.5 text-[8px] text-sky-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes */}
          {card.outcomes.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                Outcomes
              </p>
              <div className="space-y-1">
                {card.outcomes.map((outcome, i) => {
                  const style = OBLIG_STYLES[outcome.obligationType];
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex items-center gap-1 pt-0.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-700">{outcome.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exceptions */}
          {card.exceptions.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                Exceptions
              </p>
              <ul className="space-y-0.5">
                {card.exceptions.map((ex, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                    <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Bindings */}
          {card.actionBindings.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                Action Bindings
              </p>
              <div className="space-y-1">
                {card.actionBindings.map((binding, i) => (
                  <div key={i} className="rounded border border-rose-100 bg-white px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-gray-700">{binding.system}</span>
                      <span className="text-[10px] text-gray-400">→</span>
                      <span className="text-[10px] font-mono text-gray-600">{binding.action}</span>
                    </div>
                    <span className={`mt-0.5 inline-block rounded px-1 py-0.5 text-[8px] font-medium ${
                      binding.failureBehavior === "escalate" ? "bg-red-50 text-red-600" :
                      binding.failureBehavior === "block" ? "bg-amber-50 text-amber-600" :
                      binding.failureBehavior === "fallback" ? "bg-blue-50 text-blue-600" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      on-fail: {binding.failureBehavior}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Effective dates + provenance */}
          <div className="border-t border-rose-100 pt-2">
            {card.effectiveDates && (
              <p className="text-[9px] text-gray-400">
                <span className="font-medium">Effective:</span>{" "}
                {card.effectiveDates.from}
                {card.effectiveDates.until ? ` → ${card.effectiveDates.until}` : " → ongoing"}
              </p>
            )}
            <p className="text-[9px] text-gray-400 mt-0.5">
              <span className="font-medium">Provenance:</span> {card.provenance}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CardPanel (root export) ──────────────────────────────────────── */

export function CardPanel({
  activityId,
  registry,
  scaffold,
  onClose,
}: {
  activityId: string;
  registry: CardRegistry;
  scaffold: ScaffoldData;
  onClose: () => void;
}) {
  const activity = scaffold.elements.activities[activityId];
  const activityName = activity?.name ?? humanizeId(activityId);
  const { concepts, policies } = getCardsForActivity(activityId, registry, scaffold);

  return (
    <div className="flex h-full flex-col border-l border-gray-100 bg-gray-50/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-vcc-900">{activityName}</h3>
          <p className="mt-0.5 flex gap-2 text-[10px] text-gray-500">
            {concepts.length > 0 && (
              <span className="rounded bg-sky-50 px-1 text-sky-700">
                {concepts.length} concept{concepts.length !== 1 ? "s" : ""}
              </span>
            )}
            {policies.length > 0 && (
              <span className="rounded bg-rose-50 px-1 text-rose-700">
                {policies.length} polic{policies.length !== 1 ? "ies" : "y"}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* MVC Context Compiler Banner */}
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-2">
        <p className="text-[10px] font-medium text-indigo-600">
          Minimum Viable Context — cards compiled for this activity step
        </p>
      </div>

      {/* Card list */}
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {/* Concept Cards */}
        {concepts.length > 0 && (
          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-sky-500">
              Concept Cards
            </p>
            <div className="space-y-2">
              {concepts.map((c) => (
                <ConceptCardBlock key={c.cardId} card={c} />
              ))}
            </div>
          </div>
        )}

        {/* Policy Cards */}
        {policies.length > 0 && (
          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-rose-500">
              Policy Cards
            </p>
            <div className="space-y-2">
              {policies.map((p) => (
                <PolicyCardBlock key={p.cardId} card={p} />
              ))}
            </div>
          </div>
        )}

        {concepts.length === 0 && policies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="h-8 w-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2 text-xs text-gray-400">No cards anchored to this activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
