import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CareerPresentation } from "../../classic/careerPresentation";
import { CareerKeyEventDialog } from "./CareerKeyEventDialog";

type MilestonePanel = Extract<
  CareerPresentation["panel"],
  { readonly kind: "milestone" }
>;

const MILESTONE: MilestonePanel = {
  age: 21,
  club: {
    abbreviation: "ARS",
    color: "#EF0107",
    id: "arsenal",
    name: "阿森纳",
    shortName: "阿森纳",
    subtitle: "英超",
  },
  honors: [
    {
      kind: "trophy",
      label: "联赛冠军",
      scope: "club",
      trophy: "league",
    },
  ],
  kind: "milestone",
  nationalTournaments: [],
  statuses: [],
  tierChange: null,
  title: "赛季里程碑",
};

describe("CareerKeyEventDialog", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("focuses Continue, accepts Escape once, and restores the trigger focus", async () => {
    const continued = vi.fn();
    const user = userEvent.setup();

    render(<DialogHarness onContinue={continued} />);
    const trigger = screen.getByRole("button", {
      name: "显示关键事件",
    });

    await user.click(trigger);

    expect(
      screen.getByRole("dialog", {
        name: "21 岁赛季里程碑",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "继续" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(continued).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("turns repeated Continue activation into one acknowledgement", () => {
    const continued = vi.fn();

    render(
      <CareerKeyEventDialog
        onContinue={continued}
        panel={MILESTONE}
      />,
    );
    const button = screen.getByRole("button", {
      name: "继续",
    });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(continued).toHaveBeenCalledTimes(1);
  });
});

function DialogHarness({
  onContinue,
}: {
  readonly onContinue: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        显示关键事件
      </button>
      {open ? (
        <CareerKeyEventDialog
          onContinue={() => {
            onContinue();
            setOpen(false);
          }}
          panel={MILESTONE}
        />
      ) : null}
    </>
  );
}
