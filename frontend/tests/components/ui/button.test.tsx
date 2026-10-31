import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button UI component", () => {
  it("renders with children and handles click", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const btn = screen.getByRole("button", { name: "Click Me" });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    let btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-status-error");

    rerender(<Button variant="outline">Outline</Button>);
    btn = screen.getByRole("button", { name: "Outline" });
    expect(btn.className).toContain("border");

    rerender(<Button variant="ghost">Ghost</Button>);
    btn = screen.getByRole("button", { name: "Ghost" });
    expect(btn.className).toContain("hover:bg-hover");
  });

  it("disables button when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("disabled:opacity-50");
  });
});

