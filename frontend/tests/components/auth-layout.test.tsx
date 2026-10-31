import { render, screen } from "@testing-library/react";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AmbientBackground } from "@/components/auth/ambient-background";
import { ThemeProvider } from "@/components/theme-provider";

describe("Auth Shell Components", () => {
  it("renders AuthHeader with logo and optional action link", () => {
    render(
      <ThemeProvider>
        <AuthHeader
          promptText="Already have an account?"
          actionText="Login"
          actionHref="/login"
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Feedback System")).toBeInTheDocument();
    expect(screen.getByText("Already have an account?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("renders AuthFooter with copyright and legal links", () => {
    render(<AuthFooter />);

    expect(screen.getByText(/© 2026 Feedback System/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms of service" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Security" })).toBeInTheDocument();
  });

  it("renders AmbientBackground without crashing", () => {
    const { container } = render(<AmbientBackground mirrored />);
    expect(container.querySelector(".paper-grain")).toBeInTheDocument();
  });
});

