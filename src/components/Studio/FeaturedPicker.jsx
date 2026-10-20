import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as artistService from "../../services/artistService";
import { MAX_FEAT } from "../../utils/studio";

// Ô chọn nghệ sĩ feat (UC37)
export default function FeaturedPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = keyword.trim();
    if (!q) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const list = await artistService.searchArtists(q);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const visible = keyword.trim() ? results.filter((a) => !value.some((v) => v.id === a.id)) : [];
  const full = value.length >= MAX_FEAT;

  return (
    <div>
      {value.length > 0 && (
        <div className="studio-chips">
          {value.map((a) => (
            <span key={a.id} className="studio-chip">
              {a.artistName}
              <button
                type="button"
                aria-label={t("studio.removeFeat")}
                onClick={() => onChange(value.filter((v) => v.id !== a.id))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={keyword}
        disabled={full}
        placeholder={full ? t("studio.featMax", { max: MAX_FEAT }) : t("studio.featSearch")}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {visible.length > 0 && (
        <ul className="studio-suggest">
          {visible.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, a]);
                  setKeyword("");
                  setResults([]);
                }}
              >
                {a.artistName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
