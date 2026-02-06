import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

const csvData = [
  { id: 1, date: "2018-01-01", temperature: 32, humidity: 65, windSpeed: 12.3, pressure: 1013.2 },
  { id: 2, date: "2018-01-02", temperature: 28, humidity: 72, windSpeed: 8.1, pressure: 1015.4 },
  { id: 3, date: "2018-01-03", temperature: 35, humidity: 58, windSpeed: 15.7, pressure: 1010.8 },
  { id: 4, date: "2018-01-04", temperature: 30, humidity: 63, windSpeed: 10.2, pressure: 1012.1 },
  { id: 5, date: "2018-01-05", temperature: 42, humidity: 55, windSpeed: 6.5, pressure: 1018.3 },
  { id: 6, date: "2018-01-06", temperature: 38, humidity: 60, windSpeed: 9.8, pressure: 1016.0 },
  { id: 7, date: "2018-01-07", temperature: 45, humidity: 48, windSpeed: 14.1, pressure: 1014.7 },
  { id: 8, date: "2018-01-08", temperature: 33, humidity: 70, windSpeed: 7.3, pressure: 1011.5 },
  { id: 9, date: "2018-01-09", temperature: 29, humidity: 75, windSpeed: 11.6, pressure: 1009.2 },
  { id: 10, date: "2018-01-10", temperature: 36, humidity: 62, windSpeed: 13.4, pressure: 1013.8 },
  { id: 11, date: "2018-01-11", temperature: 40, humidity: 50, windSpeed: 5.9, pressure: 1017.1 },
  { id: 12, date: "2018-01-12", temperature: 37, humidity: 57, windSpeed: 8.7, pressure: 1015.6 },
  { id: 13, date: "2018-01-13", temperature: 31, humidity: 68, windSpeed: 16.2, pressure: 1008.4 },
  { id: 14, date: "2018-01-14", temperature: 44, humidity: 45, windSpeed: 4.3, pressure: 1020.0 },
  { id: 15, date: "2018-01-15", temperature: 39, humidity: 53, windSpeed: 10.8, pressure: 1014.3 },
  { id: 16, date: "2018-01-16", temperature: 34, humidity: 66, windSpeed: 12.0, pressure: 1012.7 },
  { id: 17, date: "2018-01-17", temperature: 27, humidity: 78, windSpeed: 9.1, pressure: 1007.9 },
  { id: 18, date: "2018-01-18", temperature: 41, humidity: 52, windSpeed: 7.6, pressure: 1016.8 },
  { id: 19, date: "2018-01-19", temperature: 46, humidity: 44, windSpeed: 3.8, pressure: 1021.2 },
  { id: 20, date: "2018-01-20", temperature: 35, humidity: 61, windSpeed: 11.3, pressure: 1013.5 },
];

const columns = ["date", "temperature", "humidity", "windSpeed", "pressure"];
const columnLabels: Record<string, string> = {
  date: "Date",
  temperature: "Temp (F)",
  humidity: "Humidity (%)",
  windSpeed: "Wind (mph)",
  pressure: "Pressure (hPa)",
};

export function DataTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredData = csvData.filter((row) => {
    if (!searchQuery) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof typeof a];
    const bVal = b[sortColumn as keyof typeof b];
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Version + Search Row */}
      <div className="flex items-center gap-6 px-5 py-3 shrink-0">
        <button className="flex items-center gap-1 bg-black/5 rounded-md px-3 h-[24px] shrink-0">
          <span className="text-[13px] text-[rgba(0,0,0,0.85)]" style={{ fontWeight: 510 }}>
            Version
          </span>
          <ChevronDown className="w-3 h-3 text-[rgba(0,0,0,0.85)]" />
        </button>
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={`h-[28px] px-2 text-left cursor-pointer select-none ${
                    i > 0 ? "border-l border-[rgba(0,0,0,0.1)]" : "pl-[12px]"
                  } border-b border-[rgba(0,0,0,0.05)] bg-[rgba(245,245,245,0.67)]`}
                  style={{ minWidth: 100 }}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] text-[rgba(0,0,0,0.85)] truncate"
                      style={{ fontWeight: 700 }}
                    >
                      {columnLabels[col]}
                    </span>
                    <ChevronDown
                      className={`w-[9px] h-[9px] text-[rgba(0,0,0,0.5)] transition-transform ${
                        sortColumn === col && sortDirection === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.id} className="hover:bg-black/[0.02]">
                {columns.map((col, i) => (
                  <td
                    key={col}
                    className={`h-[28px] px-2 text-[11px] text-[rgba(0,0,0,0.85)] ${
                      i > 0 ? "border-l border-[rgba(0,0,0,0.05)]" : "pl-[12px]"
                    } border-b border-[rgba(0,0,0,0.03)]`}
                    style={{ fontWeight: 400 }}
                  >
                    {String(row[col as keyof typeof row])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
