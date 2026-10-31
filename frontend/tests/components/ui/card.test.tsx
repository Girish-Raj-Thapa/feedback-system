import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card UI components", () => {
  it("renders card with header, title, description, content and footer", () => {
    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Main content body</CardContent>
        <CardFooter>Footer info</CardFooter>
      </Card>
    );

    expect(screen.getByTestId("test-card")).toBeInTheDocument();
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
    expect(screen.getByText("Main content body")).toBeInTheDocument();
    expect(screen.getByText("Footer info")).toBeInTheDocument();
  });
});

