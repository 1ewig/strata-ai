/**
 * Result of a single edit attempt, reporting the strategy that succeeded
 * or the reason the edit could not be applied.
 */
export interface EditResult {
  success: boolean;
  newContent?: string;
  error?: string;
  strategyUsed?: "exact" | "whitespace-normalized" | "anchor-matched";
}

/**
 * Applies string-based edits to workspace file content using progressive
 * matching strategies (exact, whitespace-normalized, then anchor-matched).
 */
export class StringEditEngine {
  /**
   * Attempts to replace `searchString` in `source`, trying each matching
   * strategy in order until one succeeds.
   * @param source - The current file content.
   * @param searchString - The text to find (verbatim lines preferred).
   * @param replaceString - The text to substitute in its place.
   * @returns An `EditResult` with the new content on success, or an error
   * describing why matching failed.
   */
  static applyEdit(source: string, searchString: string, replaceString: string): EditResult {
    if (!searchString.trim()) {
      return { success: false, error: "searchString cannot be empty." };
    }

    const exactResult = this.applyExactMatch(source, searchString, replaceString);
    if (exactResult.success || exactResult.error) return exactResult;

    const normalizedResult = this.applyNormalizedMatch(source, searchString, replaceString);
    if (normalizedResult.success || normalizedResult.error) return normalizedResult;

    const anchorResult = this.applyAnchorMatch(source, searchString, replaceString);
    if (anchorResult.success || anchorResult.error) return anchorResult;

    return {
      success: false,
      error:
        "The `searchString` could not be matched anywhere in the current file. Make sure you copy lines verbatim from the `readFile` output. Include 1-2 lines of surrounding context as anchors.",
    };
  }

  /**
   * Strategy 1: direct substring replacement. Rejected as ambiguous when
   * the search string occurs more than once.
   * @returns An `EditResult` using the "exact" strategy, or a failure with
   * an ambiguity error when multiple matches exist.
   */
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

  /**
   * Strategy 2: line-by-line matching that ignores leading/trailing
   * whitespace and blank lines, tolerating indentation differences.
   * @returns An `EditResult` using the "whitespace-normalized" strategy,
   * or a failure when no unique match is found.
   */
  private static applyNormalizedMatch(
    source: string,
    searchString: string,
    replaceString: string,
  ): EditResult {
    // Normalize CRLF endings and collapse whitespace runs before comparing
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

  /**
   * Strategy 3: matches only the first and last search lines within a
   * bounded window of the source, replacing the span between them when the
   * middle content differs.
   * @returns An `EditResult` using the "anchor-matched" strategy, or a
   * failure when the anchors cannot be uniquely located.
   */
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
        // Allow up to 5 extra lines between anchors to tolerate drift in the middle
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
