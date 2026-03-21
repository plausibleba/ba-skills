import { useMemo } from "react";
import { tv } from "../theme.ts";
import { PPITEntry } from "../domain/ppit-enrichment.ts";
import { L1Block, CapNode } from "./capability-map-types.ts";

export function CapabilityTable({
  hierarchy,
  ppitByCapId,
  onSelect,
  selectedId,
}: {
  hierarchy: L1Block[];
  ppitByCapId: Map<string, PPITEntry>;
  onSelect: (c: CapNode) => void;
  selectedId: string | null;
}) {
  // Flatten all caps with their L1/L2/L3 ancestry
  const rows = useMemo(() => {
    const result: {
      cap: CapNode;
      l1Name: string;
      l2Name: string;
      l3Name: string;
      ppit: PPITEntry | undefined;
    }[] = [];
    for (const l1 of hierarchy) {
      for (const l2 of l1.l2s) {
        // Caps under L3 groups
        for (const l3 of l2.l3s) {
          for (const cap of l3.caps) {
            result.push({ cap, l1Name: l1.name, l2Name: l2.name, l3Name: l3.name, ppit: ppitByCapId.get(cap.id) });
          }
        }
        // Direct caps under L2
        for (const cap of l2.caps) {
          result.push({ cap, l1Name: l1.name, l2Name: l2.name, l3Name: "—", ppit: ppitByCapId.get(cap.id) });
        }
      }
    }
    return result;
  }, [hierarchy, ppitByCapId]);

  const thStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: tv.textDim,
    borderBottom: `1px solid ${tv.borderSubtle}`,
    textAlign: "left" as const,
    position: "sticky" as const,
    top: 0,
    background: tv.bgSurface,
    zIndex: 1,
  };
  const tdStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 10,
    color: tv.textSecondary,
    borderBottom: `1px solid ${tv.borderSubtle}`,
    verticalAlign: "top" as const,
  };

  const chipList = (items: string[], color: string) => {
    if (!items || items.length === 0) return <span style={{ color: tv.textDim, fontSize: 9 }}>—</span>;
    return (
      <div className="flex flex-wrap gap-0.5">
        {items.slice(0, 4).map(item => (
          <span key={item} className="inline-block rounded px-1 py-0 text-[8px]" style={{ backgroundColor: `${color}18`, color }}>
            {item}
          </span>
        ))}
        {items.length > 4 && <span className="text-[8px]" style={{ color: tv.textDim }}>+{items.length - 4}</span>}
      </div>
    );
  };

  return (
    <div className="rounded-lg" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard, maxHeight: 600, overflow: "auto" }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Business Area</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Group</th>
            <th style={thStyle}>Capability</th>
            <th style={thStyle}>People</th>
            <th style={thStyle}>Process</th>
            <th style={thStyle}>Information</th>
            <th style={thStyle}>Technology</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.cap.id}
              onClick={() => onSelect(row.cap)}
              className="cursor-pointer transition-colors"
              style={{
                background: selectedId === row.cap.id ? tv.accentMuted : undefined,
              }}
              onMouseOver={(e) => { if (selectedId !== row.cap.id) (e.currentTarget.style.background = tv.bgSurface); }}
              onMouseOut={(e) => { if (selectedId !== row.cap.id) (e.currentTarget.style.background = ""); }}
            >
              <td style={tdStyle}>{row.l1Name}</td>
              <td style={tdStyle}>{row.l2Name}</td>
              <td style={tdStyle}>{row.l3Name}</td>
              <td style={{ ...tdStyle, color: tv.textPrimary, fontWeight: 500 }}>{row.cap.name}</td>
              <td style={tdStyle}>{chipList(row.ppit?.roles ?? [], "#f59e0b")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.activityNames ?? [], "#10b981")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.infoObjects ?? [], "#3b82f6")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.techApps ?? [], "#8b5cf6")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
