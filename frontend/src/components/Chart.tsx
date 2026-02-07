import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export interface ChartConfig {
  chart_type: string;
  x_key: string;
  y_key: string;
  color_key?: string | null;
}

interface ChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  thumbnail?: boolean;
}

const CHART_COLORS = [
  "#9333ea", "#a855f7", "#c084fc", "#7c3aed",
  "#6d28d9", "#5b21b6", "#d8b4fe",
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#252131",
    border: "1px solid rgba(147,51,234,0.3)",
    borderRadius: 8,
    fontSize: 11,
  },
  labelStyle: { color: "#e4e4e7" },
  itemStyle: { color: "#a1a1aa" },
};

const axisProps = {
  tick: { fill: "#a1a1aa", fontSize: 10 },
  axisLine: { stroke: "rgba(147,51,234,0.2)" },
  tickLine: false as const,
};

export function Chart({ config, data, thumbnail = false }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-[11px]" style={{ color: "#a1a1aa" }}>No data</p>
      </div>
    );
  }

  const { chart_type, x_key, y_key } = config;

  // Determine actual y key - data might use "count" instead of y_key
  const firstRow = data[0];
  const actualYKey = firstRow?.[y_key] !== undefined ? y_key : "count";

  const margin = thumbnail
    ? { top: 4, right: 4, left: 4, bottom: 4 }
    : { top: 10, right: 10, left: 0, bottom: 5 };

  switch (chart_type) {
    case "bar":
    case "histogram":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={margin}>
            {!thumbnail && <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.1)" />}
            <XAxis
              dataKey={x_key}
              {...axisProps}
              hide={thumbnail}
              angle={data.length > 8 ? -35 : 0}
              textAnchor={data.length > 8 ? "end" : "middle"}
              height={thumbnail ? 0 : data.length > 8 ? 55 : 30}
              interval={0}
            />
            <YAxis {...axisProps} hide={thumbnail} width={thumbnail ? 0 : 45} />
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Bar dataKey={actualYKey} fill="#9333ea" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
            {!thumbnail && <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.1)" />}
            <XAxis dataKey={x_key} {...axisProps} hide={thumbnail} />
            <YAxis {...axisProps} hide={thumbnail} width={thumbnail ? 0 : 45} />
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Line
              type="monotone"
              dataKey={actualYKey}
              stroke="#9333ea"
              strokeWidth={2}
              dot={thumbnail ? false : { fill: "#9333ea", r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={margin}>
            {!thumbnail && <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.1)" />}
            <XAxis dataKey={x_key} {...axisProps} hide={thumbnail} />
            <YAxis {...axisProps} hide={thumbnail} width={thumbnail ? 0 : 45} />
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Area
              type="monotone"
              dataKey={actualYKey}
              stroke="#9333ea"
              fill="rgba(147,51,234,0.3)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={margin}>
            {!thumbnail && <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.1)" />}
            <XAxis dataKey={x_key} {...axisProps} hide={thumbnail} name={x_key} />
            <YAxis dataKey={actualYKey} {...axisProps} hide={thumbnail} width={thumbnail ? 0 : 45} name={actualYKey} />
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Scatter data={data} fill="#9333ea" />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Pie
              data={data}
              dataKey={actualYKey}
              nameKey={x_key}
              cx="50%"
              cy="50%"
              outerRadius={thumbnail ? "85%" : "65%"}
              label={thumbnail ? false : ({ name, percent }: { name: string; percent: number }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={thumbnail ? false : { stroke: "#a1a1aa" }}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            {!thumbnail && <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={margin}>
            {!thumbnail && <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.1)" />}
            <XAxis dataKey={x_key} {...axisProps} hide={thumbnail} />
            <YAxis {...axisProps} hide={thumbnail} width={thumbnail ? 0 : 45} />
            {!thumbnail && <Tooltip {...tooltipStyle} />}
            <Bar dataKey={actualYKey} fill="#9333ea" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}
