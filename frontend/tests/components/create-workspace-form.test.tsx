import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { authRepository } from "@/repositories/auth.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    createWorkspace: jest.fn(),
  },
}));

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders workspace name field and industry presets", () => {
    render(<CreateWorkspaceForm />);

    expect(screen.getByLabelText("Workspace name")).toBeInTheDocument();
    expect(screen.getByText("SaaS & Software")).toBeInTheDocument();
    expect(screen.getByText("E-Commerce")).toBeInTheDocument();
    expect(screen.getByText("Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("Services & Agency")).toBeInTheDocument();
  });

  it("submits the form with selected preset and calls onSuccess callback", async () => {
    const mockCreatedWorkspace = {
      id: "ws-new-id",
      name: "Super SaaS",
      slug: "super-saas",
      industry: "saas",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    (authRepository.createWorkspace as jest.Mock).mockResolvedValue(mockCreatedWorkspace);
    const fetchWorkspacesSpy = jest
      .spyOn(useWorkspaceStore.getState(), "fetchWorkspaces")
      .mockResolvedValue([] as never);
    const fetchMeSpy = jest
      .spyOn(useAuthStore.getState(), "fetchMe")
      .mockResolvedValue(undefined as never);

    const onSuccess = jest.fn();
    render(<CreateWorkspaceForm onSuccess={onSuccess} />);

    // Type workspace name
    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Super SaaS" },
    });

    // Select E-Commerce preset
    fireEvent.click(screen.getByText("E-Commerce"));

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Create Workspace" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authRepository.createWorkspace).toHaveBeenCalledWith({
        name: "Super SaaS",
        industry: "ecommerce",
      });
      expect(fetchWorkspacesSpy).toHaveBeenCalled();
      expect(fetchMeSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Workspace "Super SaaS" created!');
      expect(onSuccess).toHaveBeenCalledWith(mockCreatedWorkspace);
    });
  });

  it("displays server error message when creation fails", async () => {
    (authRepository.createWorkspace as jest.Mock).mockRejectedValue(
      new Error("Workspace slug already taken")
    );

    render(<CreateWorkspaceForm />);

    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Existing Name" },
    });

    const submitBtn = screen.getByRole("button", { name: "Create Workspace" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Workspace slug already taken");
      expect(toast.error).toHaveBeenCalledWith("Workspace slug already taken");
    });
  });
});
