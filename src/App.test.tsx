import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StakingRewards from "./views/dashboard/rewards/StakingRewards";

const originalFetch = global.fetch;

afterEach(() => { global.fetch = originalFetch; });

test("shows field validation and sends valid values to the API", async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      finalBalance: 1080,
      rewards: 80,
      durationDays: 365,
      durationYears: 1,
      chart: [{ days: 0, balance: 1000 }, { days: 365, balance: 1080 }],
    }),
  });
  global.fetch = fetchMock;
  render(<StakingRewards />);
  const principal = screen.getByRole("spinbutton", { name: /principal/i });
  const submit = screen.getByRole("button", { name: /calculate rewards/i });
  fireEvent.change(principal, { target: { value: "0" } });
  fireEvent.click(submit);
  expect(screen.getByRole("alert")).toHaveTextContent("Check the highlighted inputs.");
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.change(principal, { target: { value: "1000" } });
  fireEvent.click(submit);
  expect(await screen.findByText("Projected final balance")).toBeInTheDocument();
  expect(screen.getByRole("slider")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/calculate-rewards", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ principal: 1000, apy: 8, duration: 365, durationUnit: "days", compoundingFrequency: "monthly" }),
  }));
});

test("shows a recoverable error when the API is unavailable", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("Offline"));
  render(<StakingRewards />);
  const submit = screen.getByRole("button", { name: /calculate rewards/i });
  fireEvent.click(submit);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the calculator.");
  await waitFor(() => expect(submit).toBeEnabled());
});
