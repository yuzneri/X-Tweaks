/**
 * Import and export of the settings. Both use the same box, so content copied from
 * another device can be pasted in and loaded straight away.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildExport, exportFileName } from '../settings/export.ts';
import { parseImport, type ImportError } from '../settings/import.ts';
import { SCHEMA_VERSION, type Settings } from '../settings/schema.ts';
import { clearDetected, type DetectedGroup } from '../settings/storage.ts';
import type { Messages } from '../i18n/index.ts';
import { useMessages } from './messages.tsx';
import { noteOf } from './transfer-note.ts';

type Props = {
  settings: Settings;
  /** The columns attached to an export. Empty when pro.x.com is not open */
  detected: DetectedGroup[];
  /** Replaces the settings with the ones loaded. The confirmation has already happened */
  onLoad: (settings: Settings) => void;
  /** Closes the box. Absent where it is a place of its own rather than something opened over the screen */
  onClose?: () => void;
};

/** Turns the reason for a refusal into a sentence. The reason type knows nothing about display */
const errorText = (error: ImportError, m: Messages): string => {
  const words = m.transfer.errors;
  if (error.kind === 'badJson') return words.badJson(error.detail);
  if (error.kind === 'notOurs') return words.notOurs;
  // Some files carry no version. There, all that is said is that it could not be read
  return words.badVersion(error.version === undefined ? '?' : String(error.version), SCHEMA_VERSION);
};

export const Transfer = ({ settings, detected, onLoad, onClose }: Props) => {
  const m = useMessages();
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [forgotten, setForgotten] = useState<'done' | 'failed' | null>(null);
  /** Whether the user has touched the box. Once they have, it is not overwritten with the export */
  const [draft, setDraft] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // The timestamp is built along with the contents. Fixing it at the moment of opening would disagree once the settings change
  const { at, text } = useMemo(() => {
    const at = new Date();
    return { at, text: buildExport(settings, detected, at) };
  }, [settings, detected]);

  const shown = draft ?? text;

  // Once the contents change, an earlier "copied" notice is stale.
  // The "loaded" notice is not cleared here (loading also returns the box to the export side, so it clears the instant it appears)
  useEffect(() => setCopied(null), [shown]);

  // On opening, move to where reading starts. Not moved when it is rebuilt by a change in another tab
  useEffect(() => {
    const area = box.current;
    if (!area) return;
    area.focus();
    // Focusing sends the caret to the end and scrolls there. Let it be read from the top
    area.setSelectionRange(0, 0);
    area.scrollTop = 0;
  }, []);

  const edit = (value: string) => {
    setDraft(value);
    setError(null);
    setConfirming(false);
    setLoaded(false);
  };

  const save = () => {
    const url = URL.createObjectURL(new Blob([shown], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(at);
    // Firefox sometimes ignores a click on an element not connected to the document
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoked after the download has begun. Revoking in the same turn can leave the file empty
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const copy = () => {
    navigator.clipboard.writeText(shown).then(
      () => setCopied('done'),
      // Permission is sometimes refused. Rather than failing silently, offer another way
      () => setCopied('failed')
    );
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    try {
      edit(await file.text());
    } catch {
      // It can fail because the file was deleted after being chosen, or there is no permission to read it
      setError(m.transfer.errors.badFile);
    }
  };

  /** Checks whether it can be read first. Nothing unreadable gets a confirmation */
  const ask = () => {
    const result = parseImport(shown);
    if (!result.ok) {
      setError(errorText(result.error, m));
      setConfirming(false);
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const load = () => {
    const result = parseImport(shown);
    if (!result.ok) {
      // The box can be rewritten while the confirmation is up. Check again before touching storage
      setError(errorText(result.error, m));
      setConfirming(false);
      return;
    }
    onLoad(result.settings);
    setConfirming(false);
    // Drop the draft so the replaced settings show on the export side
    setDraft(null);
    setLoaded(true);
  };

  // What to announce is decided by `noteOf`. This only looks the wording up
  const decided = noteOf({ error, copied, loaded, forgotten });
  const note = decided === null ? '' : decided.kind === 'error' ? decided.text : m.transfer[decided.kind];

  return (
    <section class="transfer">
      <div class="row">
        <span>{m.transfer.legend}</span>
        <button type="button" onClick={save}>
          {m.transfer.save}
        </button>
        <button type="button" onClick={copy}>
          {m.transfer.copy}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}>
            {m.transfer.close}
          </button>
        )}
      </div>

      <textarea
        ref={box}
        rows={12}
        value={shown}
        aria-label={m.transfer.legend}
        onInput={(e) => edit(e.currentTarget.value)}
      />

      {/* Switching a note and the hint in the same place would make the hint vanish the instant something is copied */}
      <p class="hint">{m.transfer.hint}</p>

      <div class="row">
        {/* The file chooser is shown as a button. A bare `input[type=file]` looks different on every platform */}
        <input
          ref={picker}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void choose(e.currentTarget.files?.[0]);
            // So that choosing the same file again still fires change
            e.currentTarget.value = '';
          }}
        />
        <button type="button" onClick={() => picker.current?.click()}>
          {m.transfer.choose}
        </button>
        <button type="button" onClick={ask}>
          {m.transfer.load}
        </button>
        {/* Throws away the record of detected columns. The settings are untouched, so no confirmation is interposed */}
        <button
          type="button"
          onClick={() => {
            // Announce only after confirming it was cleared. A failure must not silently read as "cleared"
            clearDetected().then(
              () => setForgotten('done'),
              () => setForgotten('failed')
            );
          }}
        >
          {m.transfer.forget}
        </button>
      </div>

      {confirming && (
        <div class="row add confirm">
          <span>{m.transfer.confirm}</span>
          <button type="button" class="danger" onClick={load}>
            {m.transfer.confirmYes}
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            {m.transfer.confirmNo}
          </button>
        </div>
      )}

      <p class={error ? 'error' : 'hint'} role="status" aria-live="polite">
        {note}
      </p>
    </section>
  );
};
