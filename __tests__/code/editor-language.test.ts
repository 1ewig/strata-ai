import { describe, it, expect } from 'bun:test';
import { resolveEditorLanguage } from '@/lib/code/editor-language';

describe('resolveEditorLanguage', () => {
  it('maps the JS/TS family to the shared JavaScript grammar with dialect flags', () => {
    expect(resolveEditorLanguage('app.js')).toEqual({
      kind: 'javascript',
      id: 'javascript',
      jsx: false,
      typescript: false,
    });
    expect(resolveEditorLanguage('app.ts')).toEqual({
      kind: 'javascript',
      id: 'typescript',
      jsx: false,
      typescript: true,
    });
    expect(resolveEditorLanguage('App.jsx')).toEqual({
      kind: 'javascript',
      id: 'jsx',
      jsx: true,
      typescript: false,
    });
    expect(resolveEditorLanguage('App.tsx')).toEqual({
      kind: 'javascript',
      id: 'tsx',
      jsx: true,
      typescript: true,
    });
  });

  it('maps first-class grammars to their static extension', () => {
    expect(resolveEditorLanguage('index.html')).toEqual({
      kind: 'static',
      id: 'html',
      grammar: 'html',
    });
    expect(resolveEditorLanguage('notes.md')).toMatchObject({ kind: 'static', grammar: 'markdown' });
    expect(resolveEditorLanguage('data.json')).toMatchObject({ kind: 'static', grammar: 'json' });
    expect(resolveEditorLanguage('schema.yaml')).toMatchObject({ kind: 'static', grammar: 'yaml' });
    expect(resolveEditorLanguage('query.sql')).toMatchObject({ kind: 'static', grammar: 'sql' });
    expect(resolveEditorLanguage('main.py')).toMatchObject({ kind: 'static', grammar: 'python' });
    expect(resolveEditorLanguage('styles.css')).toMatchObject({ kind: 'static', grammar: 'css' });
  });

  it('maps legacy stream grammars', () => {
    expect(resolveEditorLanguage('deploy.sh')).toMatchObject({ kind: 'legacy', grammar: 'shell' });
    expect(resolveEditorLanguage('main.rs')).toMatchObject({ kind: 'legacy', grammar: 'rust' });
    expect(resolveEditorLanguage('layout.scss')).toMatchObject({ kind: 'legacy', grammar: 'scss' });
    expect(resolveEditorLanguage('Dockerfile')).toMatchObject({
      kind: 'legacy',
      grammar: 'dockerfile',
    });
    expect(resolveEditorLanguage('icon.svg')).toMatchObject({ kind: 'legacy', grammar: 'xml' });
  });

  it('degrades unknown, empty, and unsupported names to plain text', () => {
    expect(resolveEditorLanguage('mystery.xyz')).toEqual({ kind: 'plain', id: 'text' });
    expect(resolveEditorLanguage('')).toEqual({ kind: 'plain', id: 'text' });
    // No PHP grammar ships with @codemirror/legacy-modes; plain beats wrong.
    expect(resolveEditorLanguage('index.php')).toEqual({ kind: 'plain', id: 'text' });
  });

  it('is driven by file extension, not casing', () => {
    expect(resolveEditorLanguage('NOTES.MD')).toMatchObject({ kind: 'static', grammar: 'markdown' });
  });
});
