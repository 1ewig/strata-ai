'use client';

import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { getEditorLanguageExtension } from '@/lib/code/cm-language';
import { strataEditorTheme } from '@/lib/code/cm-theme';

export interface UseCodeMirrorOptions {
  /** Current document text, owned by the parent (single source of truth). */
  value: string;
  /** File name driving language highlighting; may change while editing. */
  fileName: string;
  /** Emitted on every document change so the parent can persist it. */
  onChange: (value: string) => void;
  /** Hard character cap, mirroring the previous textarea `maxLength`. */
  maxChars: number;
}

/**
 * Owns the CodeMirror editor lifecycle for the workspace drawer: creates the
 * view on mount, keeps it in sync with the parent's controlled value, reloads
 * the grammar when the file is renamed, and enforces the character cap.
 *
 * @param options - Controlled value, file name, change handler, and cap.
 * @returns A ref to attach to the editor host element.
 */
export function useCodeMirror({ value, fileName, onChange, maxChars }: UseCodeMirrorOptions) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());

  // Keep the latest parent callback without rebuilding the view on each render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Captured at mount so the create effect can stay mount-only.
  const initialValueRef = useRef(value);
  const initialFileNameRef = useRef(fileName);
  const maxCharsRef = useRef(maxChars);
  maxCharsRef.current = maxChars;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          rectangularSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightSelectionMatches(),
          search({ top: true }),
          EditorView.lineWrapping,
          keymap.of([
            // Escape releases the editor so keyboard users are never trapped
            // in a Tab-inserts-indentation surface inside the drawer.
            {
              key: 'Escape',
              run: (current) => {
                current.contentDOM.blur();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          placeholder('Type your code, markdown, or text content here…'),
          EditorView.contentAttributes.of({
            'aria-label': 'File content',
            autocapitalize: 'off',
            autocorrect: 'off',
            spellcheck: 'false',
          }),
          // Reject edits that would push the document past the workspace cap,
          // matching the previous textarea's `maxLength` behavior.
          EditorState.changeFilter.of(
            (transaction) => !transaction.docChanged || transaction.newDoc.length <= maxCharsRef.current,
          ),
          languageCompartment.current.of(getEditorLanguageExtension(initialFileNameRef.current)),
          strataEditorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Reconfigure, rather than rebuild, when the file is renamed.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageCompartment.current.reconfigure(getEditorLanguageExtension(fileName)),
    });
  }, [fileName]);

  // Adopt external value changes (e.g. a programmatic reset) without echoing
  // the user's own keystrokes back through the view.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return { hostRef };
}
