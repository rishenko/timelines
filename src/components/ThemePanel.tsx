import { PRESETS, THEME_FIELDS, readabilityWarnings, type ThemeKey, type ThemeSetting } from '../lib/theme.ts';

interface Props {
  theme: ThemeSetting;
  onChange: (t: ThemeSetting) => void;
  /** Forget the saved choice and use the timeline's own default theme. */
  onReset: () => void;
}

export function ThemePanel({ theme, onChange, onReset }: Props) {
  const warnings = readabilityWarnings(theme.colors);
  const setColor = (key: ThemeKey, value: string) =>
    onChange({ preset: 'custom', colors: { ...theme.colors, [key]: value.toLowerCase() } });

  return (
    <div className="theme-panel">
      <section>
        <h3>Presets</h3>
        <div className="presets">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button
              key={id}
              className={`preset ${theme.preset === id ? 'on' : ''}`}
              aria-pressed={theme.preset === id}
              onClick={() => onChange({ preset: id, colors: { ...p.colors } })}
            >
              <span className="swatches" aria-hidden>
                {(['bg', 'panel', 'text', 'accent', 'focus'] as const).map((k) => (
                  <span key={k} style={{ background: p.colors[k] }} />
                ))}
              </span>
              {p.label}
            </button>
          ))}
          {theme.preset === 'custom' && <span className="muted small">Custom</span>}
        </div>
        <p className="muted small">
          Saved in this browser and used on every timeline. Track colors are set per track in edit mode.{' '}
          <button className="linklike" onClick={onReset}>
            Use each timeline's own theme
          </button>
        </p>
      </section>
      <section className="colors">
        <h3>Colors</h3>
        <div className="color-grid">
          {THEME_FIELDS.map(({ key, label, hint }) => (
            <label key={key} className="color-field" title={hint}>
              <input type="color" value={theme.colors[key]} onChange={(e) => setColor(key, e.target.value)} />
              <span>
                {label}
                <small className="muted">{hint}</small>
              </span>
            </label>
          ))}
        </div>
        {warnings.length > 0 && (
          <ul className="theme-warnings" role="status">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
