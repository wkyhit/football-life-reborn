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

  it("allows each consecutive season milestone to be acknowledged once", () => {
    const continued = vi.fn();
    const rendered = render(
      <CareerKeyEventDialog
        onContinue={continued}
        panel={MILESTONE}
      />,
    );
    expect(
      screen.getByRole("button", { name: "继续" }),
    ).toHaveFocus();

    fireEvent.click(
      screen.getByRole("button", { name: "继续" }),
    );
    rendered.rerender(
      <CareerKeyEventDialog
        onContinue={continued}
        panel={{ ...MILESTONE, age: 22 }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "继续" }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: "继续" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "继续" }),
    );

    expect(continued).toHaveBeenCalledTimes(2);
  });

  it("uses only Enhanced tokens for its backdrop, content, and primary action", () => {
    render(
      <CareerKeyEventDialog
        onContinue={vi.fn()}
        panel={MILESTONE}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const classes = [
      dialog,
      ...dialog.querySelectorAll<HTMLElement>("[class]"),
    ]
      .map(({ className }) => className)
      .join(" ");

    expect(classes).not.toMatch(
      /(?:^|\s)(?:text|bg|border|backdrop:bg|shadow)-(?:amber|cyan|emerald|rose|white|black)(?:-|\/|\[|\s|$)/,
    );
    expect(classes).not.toMatch(/(?:^|\s)shadow-/);
    expect(
      screen.getByRole("button", { name: "继续" }),
    ).toHaveClass("text-enhanced-pitch-ink");
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
