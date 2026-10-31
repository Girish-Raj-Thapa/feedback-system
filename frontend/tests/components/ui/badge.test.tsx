import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge UI component", () => {
  it("renders with text content", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders with custom variants (success, error, warning, lift, drag)", () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText("Success").className).toContain("text-status-success");

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText("Error").className).toContain("text-status-error");

    rerender(<Badge variant="lift">+12.4%</Badge>);
    expect(screen.getByText("+12.4%").className).toContain("text-data-lift");
  });
});

