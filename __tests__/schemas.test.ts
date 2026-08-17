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
    ).toThrow(/name/);
  });

  it("rejects files whose fields are not strings", () => {
    expect(() =>
      agentRequestBodySchema.parse({
        messages: [],
        files: [{ ...validFile, content: 42 }],
      }),
    ).toThrow(/content/);
    expect(() =>
      agentRequestBodySchema.parse({
        messages: [],
        files: [{ ...validFile, id: null }],
      }),
    ).toThrow(/id/);
  });

  it("requires the messages array", () => {
    expect(() => agentRequestBodySchema.parse({})).toThrow(/messages/);
  });

  it("rejects a non-array messages field", () => {
    expect(() => agentRequestBodySchema.parse({ messages: "hi" })).toThrow(/messages/);
  });

  it("rejects a non-number maxSteps", () => {
    expect(() =>
      agentRequestBodySchema.parse({ messages: [], maxSteps: "lots" }),
    ).toThrow(/maxSteps/);
  });

  it("keeps message contents intentionally loose for AI SDK parts", () => {
    const parsed = agentRequestBodySchema.parse({
      messages: [{ role: 42, content: { nested: true }, parts: "anything" }],
    });
    expect(parsed.messages).toHaveLength(1);
  });
});