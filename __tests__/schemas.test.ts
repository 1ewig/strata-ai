import { describe, it, expect } from "bun:test";
import { agentRequestBodySchema } from "@/lib/schemas";

const validFile = {
  id: "f1",
  name: "notes.md",
  content: "# Notes",
  language: "markdown",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("agentRequestBodySchema", () => {
  it("accepts a minimal valid body", () => {
    const parsed = agentRequestBodySchema.parse({ messages: [{ role: "user", content: "hi" }] });
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.files).toBeUndefined();
  });

  it("preserves optional agent fields", () => {
    const parsed = agentRequestBodySchema.parse({
      messages: [],
      files: [validFile],
      model: "gemini-3.5-flash-lite",
      thinkingLevel: "high",
      maxSteps: 25,
    });
    expect(parsed.model).toBe("gemini-3.5-flash-lite");
    expect(parsed.thinkingLevel).toBe("high");
    expect(parsed.maxSteps).toBe(25);
    expect(parsed.files).toHaveLength(1);
  });

  it("applies defaults for missing optional file fields", () => {
    const parsed = agentRequestBodySchema.parse({
      messages: [],
      files: [
        {
          id: "f1",
          name: "a.md",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(parsed.files![0].content).toBe("");
    expect(parsed.files![0].language).toBe("markdown");
  });

  it("rejects files missing required fields", () => {
    expect(() =>
      agentRequestBodySchema.parse({
        messages: [],
        files: [{ id: "f1" }],
      }),
    ).toThrow();
  });

  it("requires the messages array", () => {
    expect(() => agentRequestBodySchema.parse({})).toThrow();
  });
});