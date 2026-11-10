/**
 * CodeMirror theme for the workspace editor.
 *
 * Every color references a semantic design token (`var(--color-*)`) rather than
 * a literal, so the editor follows the light/dark token swap — and the theme
 * toggle cross-fade — with no second palette to maintain. Syntax colors mirror
 * the Prism `.token.*` mapping in `globals.css` so read and edit modes agree.
 */

import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/** Chrome: layout, gutters, selection, and the in-editor search panel. */
export const strataEditorBaseTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--color-text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-label)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    // Let the drawer body own scrolling instead of nesting a second scroller.
    overflow: 'visible',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.75',
  },
  '.cm-content': {
    padding: '0.75rem 0',
    caretColor: 'var(--color-primary)',
  },
  '.cm-line': {
    padding: '0 0.75rem',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--color-primary)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, .cm-content ::selection, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--color-surface-hover) 45%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-text-faint)',
    borderRight: '1px solid var(--color-edge-raised)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 0.75rem 0 0.5rem',
    minWidth: '2.5rem',
    textAlign: 'center',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--color-surface-hover) 45%, transparent)',
    color: 'var(--color-text-secondary)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
    outline: '1px solid var(--color-primary-soft-strong)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 16%, transparent)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in srgb, var(--color-warning) 22%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)',
  },
  // Search panel (Ctrl/Cmd+F) — styled with tokens so it matches both themes.
  '.cm-panels': {
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-primary)',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid var(--color-edge-raised)',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid var(--color-edge-raised)',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--color-surface-base)',
    border: '1px solid var(--color-edge-raised)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
    padding: '0.25rem 0.5rem',
    fontSize: 'var(--text-caption)',
  },
  '.cm-button': {
    backgroundColor: 'var(--color-surface-hover)',
    backgroundImage: 'none',
    border: '1px solid var(--color-edge-raised)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--text-caption)',
  },
  '.cm-panel.cm-search label': {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--text-caption)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface-elevated)',
    border: '1px solid var(--color-edge-raised)',
    color: 'var(--color-text-primary)',
  },
});

/** Syntax colors, aligned with the Prism token palette in `globals.css`. */
export const strataEditorHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: 'var(--color-primary)', fontWeight: '600' },
  { tag: [t.tagName, t.angleBracket, t.standard(t.tagName)], color: 'var(--color-primary)' },
  { tag: [t.propertyName, t.attributeName, t.labelName], color: 'var(--color-info)' },
  { tag: [t.string, t.special(t.string), t.regexp, t.character, t.attributeValue], color: 'var(--color-accent-olive)' },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom, t.unit], color: 'var(--color-warning)' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket, t.derefOperator], color: 'var(--color-text-secondary)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className, t.typeName, t.namespace], color: 'var(--color-info)', fontWeight: '500' },
  { tag: [t.variableName, t.definition(t.variableName), t.self], color: 'var(--color-text-primary)' },
  { tag: [t.heading, t.heading1, t.heading2, t.heading3], color: 'var(--color-text-bright)', fontWeight: '700' },
  { tag: t.strong, color: 'var(--color-text-bright)', fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--color-info)', textDecoration: 'underline' },
  { tag: [t.meta, t.processingInstruction, t.annotation], color: 'var(--color-text-muted)' },
  { tag: t.invalid, color: 'var(--color-danger)' },
]);

/** Full editor theme: chrome plus syntax highlighting. */
export const strataEditorTheme: Extension = [
  strataEditorBaseTheme,
  syntaxHighlighting(strataEditorHighlight),
];
