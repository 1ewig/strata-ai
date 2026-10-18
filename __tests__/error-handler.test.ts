import { describe, it, expect } from "bun:test";
import { getFriendlyErrorMessage } from "@/agent/client/error-handler";

describe("getFriendlyErrorMessage", () => {
  it("maps fetch and network failures to a connectivity message", () => {
    expect(getFriendlyErrorMessage(new Error("Failed to fetch"))).toContain("Unable to connect to the server");
    expect(getFriendlyErrorMessage(new Error("NetworkError when attempting"))).toContain(
      "Unable to connect to the server",
    );
    expect(getFriendlyErrorMessage(new Error("network unreachable"))).toContain(
      "Unable to connect to the server",
    );
  });

  it("maps 401 and unauthorized failures to a session-expired message", () => {
    expect(getFriendlyErrorMessage(new Error("401 Unauthorized"))).toContain("session has expired");
    expect(getFriendlyErrorMessage(new Error("unauthorized"))).toContain("session has expired");
  });

  it("maps 400 and limit-exceeded failures to a limits message", () => {
    expect(getFriendlyErrorMessage(new Error("400 Bad Request"))).toContain("exceeds allowed limits");
    expect(getFriendlyErrorMessage(new Error("Message exceeds maximum character limit"))).toContain(
      "exceeds allowed limits",
    );
    expect(getFriendlyErrorMessage(new Error("character limit reached"))).toContain(
      "exceeds allowed limits",
    );
  });

  it("falls back to a generic retry message for unknown errors", () => {
    expect(getFriendlyErrorMessage(new Error("Something odd happened"))).toContain(
      "I ran into a problem while processing your request",
    );
  });

  it("is case-insensitive when matching patterns", () => {
    expect(getFriendlyErrorMessage(new Error("UNAUTHORIZED"))).toContain("session has expired");
    expect(getFriendlyErrorMessage(new Error("NETWORK"))).toContain("Unable to connect to the server");
  });

  it("treats an empty message as the generic case", () => {
    expect(getFriendlyErrorMessage(new Error(""))).toContain("I ran into a problem");
  });

  it("does not leak the raw provider error text", () => {
    const message = getFriendlyErrorMessage(new Error("sk-secret-abc123 upstream exploded"));
    expect(message).not.toContain("sk-secret-abc123");
  });
});
