import { describe, it, expect, mock } from "bun:test";
import { resolveDownloadFilename, downloadWorkspaceFile } from "@/lib/workspace/download";

describe("resolveDownloadFilename", () => {
  it("preserves filenames that already have standard extensions", () => {
    expect(resolveDownloadFilename("index.html", "html")).toBe("index.html");
    expect(resolveDownloadFilename("app.tsx", "tsx")).toBe("app.tsx");
    expect(resolveDownloadFilename("main.py", "python")).toBe("main.py");
    expect(resolveDownloadFilename("styles.css", "css")).toBe("styles.css");
    expect(resolveDownloadFilename("README.md", "markdown")).toBe("README.md");
  });

  it("appends canonical extensions when filenames lack an extension", () => {
    expect(resolveDownloadFilename("notes", "markdown")).toBe("notes.md");
    expect(resolveDownloadFilename("server", "typescript")).toBe("server.ts");
    expect(resolveDownloadFilename("script", "shell")).toBe("script.sh");
    expect(resolveDownloadFilename("queries", "sql")).toBe("queries.sql");
    expect(resolveDownloadFilename("data", "json")).toBe("data.json");
    expect(resolveDownloadFilename("analysis", "python")).toBe("analysis.py");
    expect(resolveDownloadFilename("config", "yaml")).toBe("config.yaml");
    expect(resolveDownloadFilename("component", "jsx")).toBe("component.jsx");
    expect(resolveDownloadFilename("component", "tsx")).toBe("component.tsx");
  });

  it("preserves standalone filenames like Dockerfile and Makefile", () => {
    expect(resolveDownloadFilename("Dockerfile", "dockerfile")).toBe("Dockerfile");
    expect(resolveDownloadFilename("Makefile", "text")).toBe("Makefile");
  });

  it("preserves dotfiles like .env", () => {
    expect(resolveDownloadFilename(".env", "text")).toBe(".env");
  });

  it("handles empty or whitespace filenames with untitled fallback", () => {
    expect(resolveDownloadFilename("", "markdown")).toBe("untitled.md");
    expect(resolveDownloadFilename("   ", "python")).toBe("untitled.py");
  });

  it("strips trailing dots before appending canonical extension", () => {
    expect(resolveDownloadFilename("notes.", "markdown")).toBe("notes.md");
  });
});

describe("downloadWorkspaceFile", () => {
  it("safely handles SSR environment where window/document is undefined", () => {
    expect(() =>
      downloadWorkspaceFile({
        name: "test.txt",
        content: "hello",
        language: "text",
      }),
    ).not.toThrow();
  });

  it("creates a blob and clicks an anchor element when in browser environment", () => {
    let clicked = false;
    let appended = false;
    let removed = false;
    let downloadAttr = "";
    let hrefAttr = "";

    const mockAnchor = {
      href: "",
      download: "",
      style: { display: "" },
      click: () => {
        clicked = true;
        downloadAttr = mockAnchor.download;
        hrefAttr = mockAnchor.href;
      },
    };

    const mockDocument = {
      createElement: mock((tag: string) => (tag === "a" ? mockAnchor : {})),
      body: {
        appendChild: mock((node: any) => {
          appended = true;
          return node;
        }),
        removeChild: mock((node: any) => {
          removed = true;
          return node;
        }),
      },
    };

    const originalWindow = (globalThis as any).window;
    const originalDocument = (globalThis as any).document;
    const originalURL = (globalThis as any).URL;

    (globalThis as any).window = {};
    (globalThis as any).document = mockDocument;
    (globalThis as any).URL = {
      createObjectURL: mock(() => "blob:mock-url"),
      revokeObjectURL: mock(() => {}),
    };

    try {
      downloadWorkspaceFile({
        name: "my-doc",
        content: "# Hello World",
        language: "markdown",
      });

      expect(clicked).toBe(true);
      expect(appended).toBe(true);
      expect(removed).toBe(true);
      expect(downloadAttr).toBe("my-doc.md");
      expect(hrefAttr).toBe("blob:mock-url");
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }

      if (originalDocument === undefined) {
        delete (globalThis as any).document;
      } else {
        (globalThis as any).document = originalDocument;
      }

      if (originalURL === undefined) {
        delete (globalThis as any).URL;
      } else {
        (globalThis as any).URL = originalURL;
      }
    }
  });
});
