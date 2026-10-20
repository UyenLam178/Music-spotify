import { useTranslation } from "react-i18next";
import { PASSWORD_RULES } from "../../utils/validators";

// Danh sách điều kiện mật khẩu: tick xanh khi đạt, gạch đỏ khi chưa đạt (cập nhật theo từng ký tự gõ).
export default function PasswordRules({ value = "" }) {
    const { t } = useTranslation();
    const typed = value.length > 0;
    return (
        <div className="pw-rules" aria-live="polite">
            <span className="pw-rules-title">{t("validation.pwRulesTitle")}</span>
            <ul>
                {PASSWORD_RULES.map((r) => {
                    const ok = r.test(value);
                    const state = !typed ? "idle" : ok ? "ok" : "bad";
                    return (
                        <li key={r.id} className={`pw-rule ${state}`}>
                            <span className="pw-rule-mark" aria-hidden="true">{state === "ok" ? "✓" : state === "bad" ? "✕" : "•"}</span>
                            {t(r.labelKey)}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
