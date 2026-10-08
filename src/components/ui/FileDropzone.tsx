import { useId, useRef, useState } from 'react';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILES_PER_REQUEST,
  checkFileClientSide,
} from '@shared/uploads';
import { Button } from './Button';

const kb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Early feedback only: the server re-checks type, content and size, and is the real enforcement. */
export function FileDropzone({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      const err = checkFileClientSide(f);
      if (err) errs.push(err);
      else if (next.length >= MAX_FILES_PER_REQUEST)
        errs.push(`You can attach up to ${MAX_FILES_PER_REQUEST} files.`);
      else if (next.some((x) => x.name === f.name && x.size === f.size))
        errs.push(`${f.name}: already added.`);
      else next.push(f);
    }
    setProblems(errs);
    onChange(next);
    if (input.current) input.current.value = '';
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id} className="block text-sm font-medium">
          Attachments
        </label>
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          Optional. Screenshots or documents ({ALLOWED_EXTENSIONS.join(', ')}). Up to {MAX_FILES_PER_REQUEST}{' '}
          files, {MAX_FILE_BYTES / 1024 / 1024} MB each.
        </p>
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        disabled={disabled}
        accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
        aria-describedby={`${id}-hint`}
        onChange={(e) => add(e.target.files)}
        className="block w-full text-sm text-muted file:mr-4 file:min-h-[44px] file:rounded-md file:border file:border-line-strong file:bg-s1 file:px-4 file:py-2 file:text-sm file:font-medium file:text-fg hover:file:bg-s2"
      />
      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-bad">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {files.map((f) => (
            <li
              key={`${f.name}-${f.size}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {f.name} <span className="text-faint">({kb(f.size)})</span>
              </span>
              <Button
                variant="tertiary"
                disabled={disabled}
                onClick={() => onChange(files.filter((x) => x !== f))}
                aria-label={`Remove ${f.name}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
