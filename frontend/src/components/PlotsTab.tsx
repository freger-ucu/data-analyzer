import { useState } from "react";
import { Search, BarChart3, Download } from "lucide-react";
import { MarkdownLatex } from "./MarkdownLatex";

export interface PlotData {
  id: number;
  title: string;
  columnsUsed: string;
  summary: string;
  insights: string;
  path?: string; // Path to SVG file on backend
}

interface PlotsTabProps {
  plots: PlotData[];
}

function PlotImage({ path, title }: { path?: string; title: string }) {
  if (!path) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <BarChart3 className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  // Build URL for the plot image
  const imageUrl = `/api/plot-image/${path.replace(/\\/g, '/')}`;

  return (
    <img
      src={imageUrl}
      alt={title}
      className="w-full h-full object-contain"
    />
  );
}

function ExpandedPlot({
  plot,
  onCollapse,
}: {
  plot: PlotData;
  onCollapse: () => void;
}) {
  const handleDownload = () => {
    if (!plot.path) return;
    const link = document.createElement('a');
    link.href = `/api/plot-image/${plot.path.replace(/\\/g, '/')}`;
    link.download = `${plot.title.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-[20px] shrink-0 w-full border border-[rgba(142,142,147,0.1)] overflow-hidden">
      <div className="flex flex-col gap-2.5 px-5 py-2.5">
        {/* Chart */}
        <div className="w-full aspect-[4/3] rounded-[10px] overflow-hidden border border-[rgba(142,142,147,0.1)] bg-white">
          <PlotImage path={plot.path} title={plot.title} />
        </div>

        {/* Title */}
        <p className="text-[15px] text-black" style={{ fontWeight: 700 }}>
          {plot.title}
        </p>

        {/* Details row */}
        <div className="flex gap-5">
          {plot.summary && (
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-[13px] text-black" style={{ fontWeight: 510 }}>
                Summary
              </p>
              <div className="text-[10px] text-[#8e8e93]">
                <MarkdownLatex>{plot.summary}</MarkdownLatex>
              </div>
            </div>
          )}
          {plot.columnsUsed && (
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-[13px] text-black" style={{ fontWeight: 510 }}>
                Columns
              </p>
              <p className="text-[10px] text-[#8e8e93]">{plot.columnsUsed}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-[5px] justify-end">
          <button
            onClick={handleDownload}
            className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px] flex items-center gap-1"
            style={{ fontWeight: 510 }}
          >
            <Download className="w-3 h-3" />
            Save SVG
          </button>
          <button
            onClick={onCollapse}
            className="h-[24px] px-4 rounded-md bg-black/5 text-black/60 text-[13px]"
            style={{ fontWeight: 510 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlotCard({
  plot,
  isExpanded,
  onToggle,
}: {
  plot: PlotData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (isExpanded) {
    return <ExpandedPlot plot={plot} onCollapse={onToggle} />;
  }

  return (
    <div className="bg-white rounded-[20px] shrink-0 w-full border border-[rgba(142,142,147,0.1)] overflow-hidden">
      <div className="flex gap-2.5 items-start p-2.5">
        {/* Thumbnail */}
        <div className="w-[80px] h-[80px] shrink-0 rounded-[10px] overflow-hidden border border-[rgba(142,142,147,0.1)] bg-white">
          <PlotImage path={plot.path} title={plot.title} />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-1 items-end">
          <p
            className="text-[15px] text-black w-full"
            style={{ fontWeight: 700 }}
          >
            {plot.title}
          </p>
          <p className="text-[10px] text-[#8e8e93] w-full">
            {plot.columnsUsed || plot.summary || "Generated visualization"}
          </p>
          <div className="flex gap-[5px]">
            <button
              onClick={onToggle}
              className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px]"
              style={{ fontWeight: 510 }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlotsTab({ plots }: PlotsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlot, setExpandedPlot] = useState<number | null>(null);

  const filteredPlots = plots.filter((plot) => {
    if (!searchQuery) return true;
    return (
      plot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plot.columnsUsed && plot.columnsUsed.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Empty state
  if (plots.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-5">
        <div className="w-16 h-16 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-[#8e8e93]" />
        </div>
        <p className="text-[15px] text-black mb-1" style={{ fontWeight: 600 }}>
          No plots yet
        </p>
        <p className="text-[13px] text-[#8e8e93]">
          Plots will appear here as they are generated in the chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="flex items-center px-5 py-3 shrink-0">
        <div className="flex-1 flex items-center gap-1 bg-white rounded-full px-2 h-[24px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
          <Search className="w-[13px] h-[13px] text-black" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-[#4c4c4c] outline-none placeholder:text-[#4c4c4c]"
            style={{ fontWeight: 510 }}
          />
        </div>
      </div>

      {/* Plot cards */}
      <div className="flex-1 overflow-auto custom-scrollbar px-5 pb-5">
        <div className="flex flex-col gap-2.5">
          {filteredPlots.map((plot) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              isExpanded={expandedPlot === plot.id}
              onToggle={() =>
                setExpandedPlot(expandedPlot === plot.id ? null : plot.id)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
