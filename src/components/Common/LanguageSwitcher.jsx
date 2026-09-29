import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const [open, setOpen] =
        useState(false);

    const currentLanguage =
        i18n.language === "en"
            ? "English"
            : "Tiếng Việt";

    const changeLanguage = async (
        language
    ) => {
        try {
            await i18n.changeLanguage(
                language
            );

            localStorage.setItem(
                "language",
                language
            );

            setOpen(false);
        } catch (error) {
            console.error(
                "Không thể đổi ngôn ngữ:",
                error
            );
        }
    };

    return (
        <div className="language-switcher">
            <button
                type="button"
                className="language-button"
                onClick={() =>
                    setOpen((value) => !value)
                }
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <span className="language-icon">
                    🌐
                </span>

                <span>
                    {currentLanguage}
                </span>

                <span className="language-arrow">
                    {open ? "▲" : "▼"}
                </span>
            </button>

            {open && (
                <div
                    className="language-menu"
                    role="menu"
                >
                    <button
                        type="button"
                        role="menuitem"
                        className={`language-option ${
                            i18n.language === "en"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            changeLanguage("en")
                        }
                    >
                        <span>🇬🇧</span>
                        <span>English</span>
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        className={`language-option ${
                            i18n.language === "vi"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            changeLanguage("vi")
                        }
                    >
                        <span>🇻🇳</span>
                        <span>Tiếng Việt</span>
                    </button>
                </div>
            )}
        </div>
    );
}