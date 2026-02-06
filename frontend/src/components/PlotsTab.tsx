import { useState } from "react";
import { Search } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Generate sample temperature data
const tempData = Array.from({ length: 400 }, (_, i) => {
  const day = i + 1;
  // Simulate seasonal temperature pattern
  const base = 45 + 20 * Math.sin(((day - 100) / 365) * 2 * Math.PI);
  const noise = (Math.random() - 0.5) * 15;
  return { day, temperature: Math.round((base + noise) * 10) / 10 };
});

const plots = [
  {
    id: 1,
    title: "Daily High Temperatures",
    columnsUsed: "date, temperature",
    summary:
      "Temperature data shows clear seasonal patterns with highs in summer months and lows in winter.",
    insights: "Anomalies detected in early spring. Normal distribution overall.",
    columns: ["date", "temperature", "humidity"],
    chartData: tempData,
  },
  {
    id: 2,
    title: "Wind Speed Distribution",
    columnsUsed: "date, windSpeed",
    summary:
      "Wind speed varies between 3-17 mph with most readings clustered around 10 mph.",
    insights: "Right-skewed distribution. Possible outliers above 15 mph.",
    columns: ["date", "windSpeed"],
    chartData: tempData.map((d) => ({
      day: d.day,
      temperature: 5 + Math.random() * 12,
    })),
  },
  {
    id: 3,
    title: "Pressure vs Humidity",
    columnsUsed: "pressure, humidity",
    summary:
      "Inverse correlation between atmospheric pressure and humidity levels.",
    insights: "Strong negative correlation (r = -0.72). Useful for weather prediction.",
    columns: ["pressure", "humidity"],
    chartData: tempData.map((d) => ({
      day: d.day,
      temperature: 1000 + Math.random() * 20,
    })),
  },
  {
    id: 4,
    title: "Temperature Anomalies",
    columnsUsed: "date, temperature",
    summary:
      "Identified days where temperature deviates more than 2 standard deviations from the mean.",
    insights: "12 anomalous readings detected. Clustered in March and October.",
    columns: ["date", "temperature"],
    chartData: tempData,
  },
];

function MiniChart({ data }: { data: typeof tempData }) {
  return (
    <div className="w-[80px] h-[60px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.filter((_, i) => i % 5 === 0)}>
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#e74c3c"
            strokeWidth={1}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpandedPlot({
  plot,
  onCollapse,
}: {
  plot: (typeof plots)[0];
  onCollapse: () => void;
}) {
  return (
    <div className="bg-white rounded-[20px] shrink-0 w-full border border-[rgba(142,142,147,0.1)] overflow-hidden">
      <div className="flex flex-col gap-2.5 px-5 py-2.5">
        {/* Chart */}
        <div className="w-full aspect-[396/246] rounded-[10px] overflow-hidden border border-[rgba(142,142,147,0.1)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={plot.chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "rgba(0,0,0,0.5)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(0,0,0,0.5)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                label={{
                  value: "Temperature (F)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "rgba(0,0,0,0.5)" },
                }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#e74c3c"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Title */}
        <p className="text-[15px] text-black" style={{ fontWeight: 700 }}>
          {plot.title}
        </p>

        {/* Details row */}
        <div className="flex gap-5">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[13px] text-black" style={{ fontWeight: 510 }}>
              Summary
            </p>
            <p className="text-[10px] text-[#8e8e93]">{plot.summary}</p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[13px] text-black" style={{ fontWeight: 510 }}>
              Insights
            </p>
            <p className="text-[10px] text-[#8e8e93]">{plot.insights}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <p className="text-[13px] text-black" style={{ fontWeight: 510 }}>
              Columns
            </p>
            <ul className="list-disc pl-4">
              {plot.columns.map((col) => (
                <li key={col} className="text-[10px] text-[#8e8e93]">
                  {col}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-[5px] justify-end">
          <button
            onClick={onCollapse}
            className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px]"
            style={{ fontWeight: 510 }}
          >
            Save PNG
          </button>
          <button
            className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px]"
            style={{ fontWeight: 510 }}
          >
            Ask
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
  plot: (typeof plots)[0];
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
          <MiniChart data={plot.chartData} />
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
            {plot.columnsUsed}
          </p>
          <div className="flex gap-[5px]">
            <button
              onClick={onToggle}
              className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px]"
              style={{ fontWeight: 510 }}
            >
              View
            </button>
            <button
              className="h-[24px] px-4 rounded-md bg-[#0d6fff]/10 text-[#08f] text-[13px]"
              style={{ fontWeight: 510 }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlotsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlot, setExpandedPlot] = useState<number | null>(null);

  const filteredPlots = plots.filter((plot) => {
    if (!searchQuery) return true;
    return (
      plot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.columnsUsed.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
      <div className="flex-1 overflow-auto px-5 pb-5">
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
