import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input UI component", () => {
  it("renders with placeholder and accepts value changes", () => {
    const handleChange = jest.fn();
    render(<Input placeholder="Enter email" onChange={handleChange} />);

    const input = screen.getByPlaceholderText("Enter email");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "test@domain.com" } });
    expect(handleChange).toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe("test@domain.com");
  });

  it("applies aria-invalid and disabled states", () => {
    render(<Input placeholder="Invalid field" aria-invalid="true" disabled />);
    const input = screen.getByPlaceholderText("Invalid field");

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

