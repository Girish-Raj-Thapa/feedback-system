import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";

describe("ThemeToggle & ThemeProvider", () => {
  it("renders theme toggle button in icon variant and toggles mode", () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="icon" />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByRole("button", { name: /switch to (dark|light) mode/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
  });

  it("renders segmented theme toggle variant with Light, Dark, Auto buttons", () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="segmented" />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auto/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dark/i }));
  });
});
