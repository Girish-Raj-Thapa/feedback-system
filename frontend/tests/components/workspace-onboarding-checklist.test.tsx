import { fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceOnboardingChecklist } from "@/components/workspace/workspace-onboarding-checklist";

describe("WorkspaceOnboardingChecklist", () => {
  const wsSlug = "test-workspace";
  const defaultProps = {
    workspaceSlug: wsSlug,
    categoriesCount: 6,
    formsCount: 1,
    submissionsCount: 0,
    hasSampleData: false,
    isLoadingSampleData: false,
    onLoadSampleData: vi.fn().mockResolvedValue(undefined),
    onClearSampleData: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the 3 checklist steps and computes 2 of 3 progress", () => {
    render(<WorkspaceOnboardingChecklist {...defaultProps} />);

    expect(screen.getByRole("region", { name: "Workspace Onboarding Checklist" })).toBeInTheDocument();
    expect(screen.getByText("Getting Started Checklist")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    // Step 1: Categories
    expect(screen.getByText("Review categories")).toBeInTheDocument();
    expect(screen.getByText("6 Categories")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configure categories/i })).toHaveAttribute(
      "href",
      `/workspace/${wsSlug}/settings?tab=categories`
    );

    // Step 2: Forms
    expect(screen.getByText("Share your form")).toBeInTheDocument();
    expect(screen.getByText("1 Form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Form Studio/i })).toHaveAttribute(
      "href",
      `/workspace/${wsSlug}/forms`
    );

    // Step 3: Sample Feedback
    expect(screen.getByText("Preview decision insights")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Load Sample Feedback/i })).toBeInTheDocument();
  });

  it("triggers onLoadSampleData when Load Sample Feedback button is clicked", () => {
    render(<WorkspaceOnboardingChecklist {...defaultProps} />);

    const loadBtn = screen.getByRole("button", { name: /Load Sample Feedback/i });
    fireEvent.click(loadBtn);

    expect(defaultProps.onLoadSampleData).toHaveBeenCalledTimes(1);
  });

  it("renders Clear Sample Data button when hasSampleData is true and triggers callback", () => {
    render(
      <WorkspaceOnboardingChecklist
        {...defaultProps}
        hasSampleData={true}
        submissionsCount={6}
      />
    );

    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Sample Active")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /Clear Sample Data/i });
    fireEvent.click(clearBtn);

    expect(defaultProps.onClearSampleData).toHaveBeenCalledTimes(1);
  });

  it("dismisses the checklist when close button is clicked and remembers in localStorage", () => {
    const { unmount } = render(<WorkspaceOnboardingChecklist {...defaultProps} />);

    expect(screen.getByText("Getting Started Checklist")).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText("Dismiss checklist");
    fireEvent.click(dismissBtn);

    expect(screen.queryByText("Getting Started Checklist")).not.toBeInTheDocument();
    expect(localStorage.getItem(`voc_onboarding_dismissed_${wsSlug}`)).toBe("true");

    unmount();

    // Re-rendering should honor localStorage and remain hidden
    render(<WorkspaceOnboardingChecklist {...defaultProps} />);
    expect(screen.queryByText("Getting Started Checklist")).not.toBeInTheDocument();
  });
});

