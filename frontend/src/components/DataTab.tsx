import { useState } from "react";
import { Search, ChevronDown, Upload, Maximize2 } from "lucide-react";

interface FileInfo {
  filename: string;
  row_count: number;
  column_count: number;
  columns: string[];
  preview: Record<string, unknown>[];
}

interface DataTabProps {
  fileInfo: FileInfo | null;
  dataVersion: "current" | "original";
  onVersionChange: (version: "current" | "original") => void;
  onExpandClick?: () => void;
}

export function DataTab({ fileInfo, dataVersion, onVersionChange, onExpandClick }: DataTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // If no file uploaded, show placeholder
  if (!fileInfo) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-5">
        <Upload className="w-10 h-10" style={{ color: '#a1a1aa' }} />
        <p className="text-[13px] text-center" style={{ fontWeight: 510, color: '#a1a1aa' }}>
          No data loaded
        </p>
        <p className="text-[11px] text-center" style={{ color: '#a1a1aa' }}>
          Upload a CSV file to see your data here
        </p>
      </div>
    );
  }

  const columns = fileInfo.columns;
  const data = fileInfo.preview;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1e1b2e' }}>
      {/* Version Dropdown + Search Row */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0">
        <div className="relative shrink-0">
          <button
            onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors"
            style={{
              background: 'linear-gradient(135deg, rgba(147,51,234,0.4) 0%, rgba(107,33,168,0.5) 100%)',
              border: '1px solid rgba(147,51,234,0.35)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[11px]" style={{ fontWeight: 510, color: '#e4e4e7' }}>
              {dataVersion === "current" ? "Current" : "Initial"}
            </span>
            <span className="text-[10px]" style={{ color: '#a1a1aa' }}>
              {fileInfo.row_count}×{fileInfo.column_count}
            </span>
            <ChevronDown className="w-3 h-3" style={{ color: '#a1a1aa' }} />
          </button>
          {versionDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setVersionDropdownOpen(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-lg py-1 min-w-[130px]"
                style={{ backgroundColor: '#252131', border: '1px solid rgba(113,113,122,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
              >
                <button
                  onClick={() => {
                    onVersionChange("original");
                    setVersionDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[12px] flex items-center justify-between"
                  style={{ color: dataVersion === "original" ? '#9333ea' : '#e4e4e7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontWeight: 510 }}>Initial</span>
                  <span style={{ color: '#a1a1aa', fontSize: '10px' }}>original</span>
                </button>
                <button
                  onClick={() => {
                    onVersionChange("current");
                    setVersionDropdownOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[12px] flex items-center justify-between"
                  style={{ color: dataVersion === "current" ? '#9333ea' : '#e4e4e7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontWeight: 510 }}>Current</span>
                  <span style={{ color: '#a1a1aa', fontSize: '10px' }}>transformed</span>
                </button>
              </div>
            </>
          )}
        </div>
        <div
          className="flex-1 flex items-center gap-1 rounded-full px-2 h-[24px]"
          style={{ backgroundColor: 'rgba(15,13,25,0.6)', border: '1px solid rgba(147,51,234,0.15)' }}
        >
          <Search className="w-[13px] h-[13px]" style={{ color: '#a1a1aa' }} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ fontWeight: 510, color: '#e4e4e7' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar" style={{ backgroundColor: '#1e1b2e' }}>
        <table className="w-full border-collapse min-w-max min-h-full" style={{ backgroundColor: '#1e1b2e' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={`h-[28px] px-2 text-left cursor-pointer select-none ${
                    i > 0 ? "border-l" : "pl-[12px]"
                  } border-b`}
                  style={{
                    minWidth: 80,
                    backgroundColor: '#161328',
                    borderColor: 'rgba(147,51,234,0.12)',
                  }}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[11px] truncate"
                      style={{ fontWeight: 700, color: '#e4e4e7' }}
                    >
                      {col}
                    </span>
                    <ChevronDown
                      className={`w-[9px] h-[9px] transition-transform shrink-0 ${
                        sortColumn === col && sortDirection === "asc" ? "rotate-180" : ""
                      }`}
                      style={{ color: '#a1a1aa' }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {columns.map((col, i) => (
                  <td
                    key={col}
                    className={`h-[28px] px-2 text-[11px] ${
                      i > 0 ? "border-l" : "pl-[12px]"
                    } border-b`}
                    style={{
                      fontWeight: 400,
                      color: '#e4e4e7',
                      borderColor: 'rgba(147,51,234,0.1)',
                    }}
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="shrink-0 px-5 py-2 flex items-center justify-between relative z-20" style={{ borderTop: '1px solid rgba(147,51,234,0.12)' }}>
        <p className="text-[10px]" style={{ color: '#a1a1aa' }}>
          Showing {sortedData.length} of {fileInfo.row_count} rows (preview)
        </p>
        <button
          onClick={onExpandClick}
          className="flex items-center justify-center rounded transition-all hover:opacity-80 cursor-pointer"
          style={{
            width: 22,
            height: 22,
            color: '#fff',
            background: 'linear-gradient(135deg, rgba(147,51,234,0.45) 0%, rgba(107,33,168,0.55) 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <Maximize2 style={{ width: 9, height: 9, flexShrink: 0 }} />
        </button>
      </div>
    </div>
  );
}
