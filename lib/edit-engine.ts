export interface EditResult {
  success: boolean;
  newContent?: string;
  error?: string;
  strategyUsed?: "exact" | "whitespace-normalized" | "anchor-matched";
}

export class ResumeEditEngine {
  static applyEdit(source: string, searchString: string, replaceString: string): EditResult {
    if (!searchString.trim()) {
      return { success: false, error: "searchString cannot be empty." };
    }

    const exactResult = this.applyExactMatch(source, searchString, replaceString);
    if (exactResult.success) return exactResult;

    const normalizedResult = this.applyNormalizedMatch(source, searchString, replaceString);
    if (normalizedResult.success) return normalizedResult;

    const anchorResult = this.applyAnchorMatch(source, searchString, replaceString);
    if (anchorResult.success) return anchorResult;

    return {
      success: false,
      error:
        "The `searchString` could not be matched anywhere in the current resume. Make sure you copy lines verbatim from `<workspace_resume>`. Include 1-2 lines of surrounding context as anchors.",
    };
  }

  private static applyExactMatch(
    source: string,
    searchString: string,
    replaceString: string,
  ): EditResult {
    const matches = source.split(searchString).length - 1;
    if (matches === 0) return { success: false };

    if (matches > 1) {
      return {
        success: false,
        error: `Ambiguous edit: \`searchString\` matched ${matches} locations. Include more surrounding context lines in \`searchString\` as anchors.`,
      };
    }

    return {
      success: true,
      newContent: source.replace(searchString, replaceString),
      strategyUsed: "exact",
    };
  }

  private static applyNormalizedMatch(
    source: string,
    searchString: string,
    replaceString: string,
  ): EditResult {
    const normalize = (str: string) => str.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    if (!normalize(source).includes(normalize(searchString))) {
      return { success: false };
    }

    const sourceLines = source.split("\n");
    const searchLines = searchString.split("\n").map((l) => l.trim()).filter(Boolean);

    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
      let match = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (sourceLines[i + j].trim() !== searchLines[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (startIdx !== -1) {
          return {
            success: false,
            error: `Ambiguous edit after whitespace normalization: matched ${searchLines.length} lines at multiple positions. Include more surrounding context.`,
          };
        }
        startIdx = i;
        endIdx = i + searchLines.length;
      }
    }

    if (startIdx !== -1 && endIdx !== -1) {
      const updatedLines = [
        ...sourceLines.slice(0, startIdx),
        replaceString,
        ...sourceLines.slice(endIdx),
      ];
      return {
        success: true,
        newContent: updatedLines.join("\n"),
        strategyUsed: "whitespace-normalized",
      };
    }

    return { success: false };
  }

  private static applyAnchorMatch(
    source: string,
    searchString: string,
    replaceString: string,
  ): EditResult {
    const searchLines = searchString.split("\n").map((l) => l.trim()).filter(Boolean);
    if (searchLines.length < 2) return { success: false };

    const firstAnchor = searchLines[0];
    const lastAnchor = searchLines[searchLines.length - 1];

    const sourceLines = source.split("\n");
    let candidateStart = -1;
    let candidateEnd = -1;

    for (let i = 0; i < sourceLines.length; i++) {
      if (sourceLines[i].trim() === firstAnchor) {
        for (let j = i + 1; j < Math.min(i + searchLines.length + 5, sourceLines.length); j++) {
          if (sourceLines[j].trim() === lastAnchor) {
            if (candidateStart !== -1) {
              return {
                success: false,
                error: `Ambiguous edit with anchor matching: anchor lines "${firstAnchor}" ... "${lastAnchor}" matched multiple locations. Include more lines in \`searchString\`.`,
              };
            }
            candidateStart = i;
            candidateEnd = j + 1;
            break;
          }
        }
      }
    }

    if (candidateStart !== -1 && candidateEnd !== -1) {
      const updatedLines = [
        ...sourceLines.slice(0, candidateStart),
        replaceString,
        ...sourceLines.slice(candidateEnd),
      ];
      return {
        success: true,
        newContent: updatedLines.join("\n"),
        strategyUsed: "anchor-matched",
      };
    }

    return { success: false };
  }
}
