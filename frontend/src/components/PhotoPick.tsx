import { useEffect, useRef, useState } from 'react';
import { Camera, FileText } from './icons';
import { useI18n } from '../i18n';

/** Pick one photo (or PDF when allowed) with a small preview. */
export function PhotoPick({ file, onFile, label, hint, allowPdf, big }: {
  file: File | null; onFile: (f: File | null) => void; label: string; hint?: string; allowPdf?: boolean; big?: boolean;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const picker = (
    <input ref={input} type="file" accept={allowPdf ? 'image/*,application/pdf' : 'image/*'} aria-label={label} hidden
      onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
  );
  if (big) {
    return (
      <div className="photo-tile-wrap">
        <span className="field-label">{label}</span>
        <button type="button" className={`photo-tile${file ? ' has-file' : ''}`} onClick={() => input.current?.click()}>
          {preview
            ? <img src={preview} alt="" />
            : (
              <span className="photo-tile-empty">
                <span className="photo-tile-icon">{file ? <FileText size={26} aria-hidden /> : <Camera size={26} aria-hidden />}</span>
                <b>{file ? file.name : t('buy.choose')}</b>
                {!file && <small>{hint}</small>}
              </span>
            )}
          {file && <span className="photo-tile-change">{t('buy.change')}</span>}
        </button>
        {picker}
      </div>
    );
  }
  return (
    <div className="capture-pick">
      {preview
        ? <img className="capture-thumb" src={preview} alt="" />
        : <div className="capture-thumb is-empty">
            {file ? <FileText size={22} strokeWidth={1.5} aria-hidden /> : <Camera size={22} strokeWidth={1.5} aria-hidden />}
          </div>}
      <div className="capture-pick-body">
        <span className="field-label">{label}</span>
        {(file || hint) && <span className="field-hint">{file ? file.name : hint}</span>}
        <button type="button" className="link" onClick={() => input.current?.click()}>
          {file ? t('buy.change') : t('buy.choose')}
        </button>
      </div>
      <input ref={input} type="file" accept={allowPdf ? 'image/*,application/pdf' : 'image/*'} aria-label={label} hidden
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
