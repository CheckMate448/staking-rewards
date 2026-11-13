import { useState } from "react";
import { Box, Slider, Typography, useTheme } from "@mui/material";

export type GrowthPoint = { days: number; balance: number };

export const formatTokens = (value: number) => new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 10,
  notation: value !== 0 && (Math.abs(value) < 0.000001 || value >= 1e12) ? "scientific" : "standard",
}).format(value);

const dayLabel = (value: number) => `Day ${formatTokens(value)}`;

export default function RewardsChart({ points }: { points: GrowthPoint[] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(points.length - 1);
  const first = points[0];
  const last = points[points.length - 1];
  const point = points[selected];
  const width = 600;
  const left = 16;
  const right = 584;
  const top = 14;
  const bottom = 154;
  const span = last.balance - first.balance;
  const x = ({ days }: GrowthPoint) => left + (days / last.days) * (right - left);
  const y = ({ balance }: GrowthPoint) => span
    ? bottom - ((balance - first.balance) / span) * (bottom - top)
    : (top + bottom) / 2;
  const line = points.map(item => `${x(item)},${y(item)}`).join(" ");
  const stroke = theme.palette.mode === "dark" ? "#58dce3" : "#087b86";

  return (
    <Box component="figure" sx={{ m: 0, mt: 3, minWidth: 0 }}>
      <Box component="figcaption" sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography fontWeight={700}>Projected growth</Typography>
        <Typography color="text.secondary">{dayLabel(point.days)} · {formatTokens(point.balance)} tokens</Typography>
      </Box>
      <Box
        component="svg"
        role="img"
        aria-label="Projected token balance over the staking term. Use the slider to explore values."
        viewBox={`0 0 ${width} 168`}
        sx={{ display: "block", width: "100%", mt: 1 }}
        onPointerMove={event => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = ((event.clientX - bounds.left) / bounds.width * width - left) / (right - left);
          const targetDay = position * last.days;
          setSelected(points.reduce((nearest, item, index) =>
            Math.abs(item.days - targetDay) < Math.abs(points[nearest].days - targetDay) ? index : nearest, 0));
        }}
      >
        {[top, (top + bottom) / 2, bottom].map(level =>
          <line key={level} x1={left} x2={right} y1={level} y2={level} stroke={theme.palette.divider} />
        )}
        <polygon points={`${left},${bottom} ${line} ${right},${bottom}`} fill={stroke} opacity={0.12} />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
        <line x1={x(point)} x2={x(point)} y1={top} y2={bottom} stroke={stroke} strokeDasharray="4 4" />
        <circle cx={x(point)} cy={y(point)} r={5} fill={stroke} stroke={theme.palette.background.paper} strokeWidth={2} />
      </Box>
      <Box sx={{ mx: 1 }}>
        <Slider
          aria-label="Explore projected balance"
          getAriaValueText={index => `${dayLabel(points[index].days)}, ${formatTokens(points[index].balance)} tokens`}
          min={0}
          max={points.length - 1}
          value={selected}
          onChange={(_, value) => setSelected(value as number)}
          sx={{ color: stroke }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography variant="caption">Day 0</Typography>
        <Typography variant="caption">{dayLabel(last.days)}</Typography>
      </Box>
    </Box>
  );
}
