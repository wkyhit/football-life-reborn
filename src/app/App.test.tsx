import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("Phase 1 Classic navigation", () => {
  it("lets a player create a Chinese striker and reach the career screen", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "足球生涯模拟器" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始生涯" }));

    expect(
      screen.getByRole("heading", { name: "你是哪国人" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      screen.getByRole("heading", { name: "填一下名字" }),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "姓名" }));
    await user.type(screen.getByRole("textbox", { name: "姓名" }), "林一鸣");
    await user.clear(screen.getByRole("spinbutton", { name: "号码" }));
    await user.type(screen.getByRole("spinbutton", { name: "号码" }), "9");
    await user.click(screen.getByRole("button", { name: "左脚" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      screen.getByRole("heading", { name: "踢哪个位置" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "中锋" }));
    await user.click(screen.getByRole("button", { name: "开始踢球" }));

    expect(
      screen.getByRole("heading", { name: "等待青训报价" }),
    ).toBeInTheDocument();
    expect(screen.getByText("林一鸣")).toBeInTheDocument();
    expect(screen.getByText("#9 中锋")).toBeInTheDocument();
    expect(screen.getByText("16 岁")).toBeInTheDocument();
    expect(screen.getByText("自由身")).toBeInTheDocument();
  });
});
