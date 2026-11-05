import { render, screen, fireEvent } from "@testing-library/react";
import { FormShareModal } from "@/components/workspace/form-share-modal";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("FormShareModal", () => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    workspaceSlug: "acme-corp",
    formSlug: "saas-feedback",
    formName: "SaaS Feedback",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<FormShareModal {...props} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal header with formName when open", () => {
    render(<FormShareModal {...props} />);
    expect(screen.getByText(/Share & Embed “SaaS Feedback”/i)).toBeInTheDocument();
  });

  it("copies link to clipboard when clicking copy link button", async () => {
    render(<FormShareModal {...props} />);
    const copyBtn = screen.getByRole("button", { name: /^Copy$/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/f/acme-corp/saas-feedback")
    );
    expect(toast.success).toHaveBeenCalledWith("Public link copied to clipboard");
  });

  it("switches to Embed tab and copies embed snippet", async () => {
    render(<FormShareModal {...props} />);
    const embedTabBtn = screen.getByRole("button", { name: /Embed Widget/i });
    fireEvent.click(embedTabBtn);

    expect(screen.getByText(/Paste this snippet before the closing/i)).toBeInTheDocument();

    const copyCodeBtn = screen.getByRole("button", { name: /Copy Snippet/i });
    fireEvent.click(copyCodeBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('data-form="saas-feedback"')
    );
    expect(toast.success).toHaveBeenCalledWith("Widget embed snippet copied to clipboard");
  });

  it("switches to QR Code tab", () => {
    render(<FormShareModal {...props} />);
    const qrTabBtn = screen.getByRole("button", { name: /QR Code/i });
    fireEvent.click(qrTabBtn);

    expect(screen.getByText(/Scan to instantly open the mobile-optimized/i)).toBeInTheDocument();
    expect(screen.getByAltText(/QR Code to Form/i)).toBeInTheDocument();
  });

  it("calls onClose when clicking close button", () => {
    render(<FormShareModal {...props} />);
    const closeBtn = screen.getByRole("button", { name: /Close share modal/i });
    fireEvent.click(closeBtn);

    expect(props.onClose).toHaveBeenCalled();
  });
});
