import { render, screen, waitFor } from "@testing-library/react";
import CreateWorkspacePage from "@/app/(auth)/create-workspace/page";
import { authRepository } from "@/repositories/auth.repository";
import { useRouter } from "next/navigation";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: jest.fn(),
  },
}));

jest.mock("@/components/workspace/create-workspace-form", () => ({
  CreateWorkspaceForm: () => <div data-testid="create-workspace-form">Workspace Form</div>,
}));

describe("CreateWorkspacePage", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  it("redirects to login if user is unauthenticated", async () => {
    (authRepository.getMe as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

    render(<CreateWorkspacePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?redirect=/create-workspace");
    });
  });

  it("renders workspace creation form when user is authenticated", async () => {
    (authRepository.getMe as jest.Mock).mockResolvedValue({
      id: "u-1",
      email: "test@example.com",
    });

    render(<CreateWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create your workspace" })).toBeInTheDocument();
      expect(screen.getByTestId("create-workspace-form")).toBeInTheDocument();
    });
  });
});

