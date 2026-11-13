import { FormEvent, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, TextField, Typography } from "@mui/material";
import RewardsChart, { formatTokens, GrowthPoint } from "./RewardsChart";

const numberFields = [
  { key: "principal", label: "Principal (tokens)", min: 0, max: 1e12, positive: true },
  { key: "apy", label: "APY (%)", min: 0, max: 1000 },
  { key: "duration", label: "Duration", min: 0, max: 50, positive: true },
  { key: "tokenPrice", label: "Token price (USD, optional)", min: 0, max: 1e9 },
] as const;

const frequencies = ["daily", "weekly", "monthly", "annually"] as const;
type NumericField = typeof numberFields[number]["key"];
type Field = NumericField | "durationUnit" | "compoundingFrequency";
type Errors = Partial<Record<Field, string>>;
type Projection = {
  finalBalance: number;
  rewards: number;
  durationYears: number;
  durationDays: number;
  chart: GrowthPoint[];
  usd?: { finalBalance: number; rewards: number };
};
type Status =
  | { type: "idle" | "loading" }
  | { type: "error"; message: string; errors: Errors }
  | { type: "success"; result: Projection };

const initialValues = {
  principal: "1000",
  apy: "8",
  duration: "365",
  tokenPrice: "",
  durationUnit: "days",
  compoundingFrequency: "monthly",
};

const formatUsd = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", notation: amount >= 1e12 ? "scientific" : "standard" }).format(amount);

export default function StakingRewards() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);

  function update(field: Field, value: string) {
    request.current?.abort();
    setValues(current => ({ ...current, [field]: value }));
    setStatus({ type: "idle" });
  }

  function maximum(field: typeof numberFields[number]) {
    return field.key === "duration" && values.durationUnit === "days" ? 18250 : field.max;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.type === "loading") return;
    const errors: Errors = {};
    for (const field of numberFields) {
      const raw = values[field.key].trim();
      if (field.key === "tokenPrice" && !raw) continue;
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value < field.min || value > maximum(field) || ("positive" in field && value === 0)) {
        const lower = "positive" in field ? "greater than 0" : "at least 0";
        errors[field.key] = `Enter a number ${lower} and at most ${maximum(field).toLocaleString()}.`;
      }
    }
    if (Object.keys(errors).length) {
      setStatus({ type: "error", message: "Check the highlighted inputs.", errors });
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 10000);
    setStatus({ type: "loading" });
    try {
      const response = await fetch("/api/calculate-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          principal: Number(values.principal),
          apy: Number(values.apy),
          duration: Number(values.duration),
          durationUnit: values.durationUnit,
          compoundingFrequency: values.compoundingFrequency,
          ...(values.tokenPrice.trim() ? { tokenPrice: Number(values.tokenPrice) } : {}),
        }),
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Calculation failed. Try again.", errors: data.errors || {} });
        return;
      }
      setStatus({ type: "success", result: data });
    } catch {
      if (!controller.signal.aborted || controller.signal.reason === "timeout") {
        setStatus({ type: "error", message: "Could not reach the calculator. Try again.", errors: {} });
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const errors = status.type === "error" ? status.errors : {};
  const loading = status.type === "loading";
  const result = status.type === "success" ? status.result : null;
  const numericInput = (field: typeof numberFields[number]) => (
    <TextField
      key={field.key}
      label={field.label}
      name={field.key}
      type="number"
      fullWidth
      required={field.key !== "tokenPrice"}
      value={values[field.key]}
      onChange={event => update(field.key, event.target.value)}
      error={Boolean(errors[field.key])}
      helperText={errors[field.key]}
      inputProps={{ min: field.min, max: maximum(field), step: "any" }}
    />
  );

  return (
    <Box component="section" aria-labelledby="staking-rewards-title" sx={{ bgcolor: "background.default", px: { xs: 2, sm: 3, md: 6 }, py: { xs: 4, md: 6 }, textAlign: "left" }}>
      <Paper variant="outlined" sx={{ mx: "auto", maxWidth: 1240, p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, borderTop: "4px solid #00b4c9" }}>
        <Typography id="staking-rewards-title" component="h2" variant="h4" fontWeight={700}>Staking Rewards Calculator</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          Estimate your token balance and rewards over a staking term.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 4fr) minmax(0, 6fr)" }, gap: { xs: 3, md: 4 } }}>
          <Box component="form" onSubmit={submit} noValidate sx={{ display: "grid", gap: 2, alignContent: "start", minWidth: 0 }}>
            {numberFields.slice(0, 2).map(numericInput)}
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 1.5 }}>
              {numericInput(numberFields[2])}
              <TextField select label="Unit" value={values.durationUnit} onChange={event => update("durationUnit", event.target.value)} error={Boolean(errors.durationUnit)} helperText={errors.durationUnit}>
                <MenuItem value="days">Days</MenuItem>
                <MenuItem value="years">Years</MenuItem>
              </TextField>
            </Box>
            <TextField select label="Compounding frequency" value={values.compoundingFrequency} onChange={event => update("compoundingFrequency", event.target.value)} error={Boolean(errors.compoundingFrequency)} helperText={errors.compoundingFrequency}>
              {frequencies.map(frequency => <MenuItem key={frequency} value={frequency}>{frequency[0].toUpperCase() + frequency.slice(1)}</MenuItem>)}
            </TextField>
            {numericInput(numberFields[3])}
            <Button type="submit" variant="contained" disabled={loading} sx={{ bgcolor: "#173039", color: "white", minHeight: 44, "&:hover": { bgcolor: "#235461" } }}>
              {loading ? "Calculating…" : "Calculate rewards"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              APY is the effective annual yield. Frequency sets the compounding intervals and chart samples.
            </Typography>
          </Box>
          <Box aria-busy={loading} sx={{ minWidth: 0, p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: "background.default", alignSelf: "start" }}>
            <Typography component="h3" variant="h6" fontWeight={700}>Your projection</Typography>
            {status.type === "idle" && <Typography color="text.secondary" sx={{ mt: 2 }}>Calculate rewards to see your projected balance here.</Typography>}
            {loading && <Box role="status" sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}><CircularProgress size={20} /> Calculating projection…</Box>}
            {status.type === "error" && <Alert severity="error" sx={{ mt: 2 }}>{status.message}</Alert>}
            {result && <>
              <Box role="status" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5, mt: 2 }}>
                {([
                  ["Projected final balance", result.finalBalance, result.usd?.finalBalance],
                  ["Total rewards", result.rewards, result.usd?.rewards],
                ] as const).map(([label, tokens, usd]) => (
                  <Paper variant="outlined" key={label} sx={{ p: 1.5, minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{formatTokens(tokens)} tokens</Typography>
                    {usd !== undefined && <Typography variant="body2">{formatUsd(usd)}</Typography>}
                  </Paper>
                ))}
              </Box>
              <RewardsChart points={result.chart} />
            </>}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
