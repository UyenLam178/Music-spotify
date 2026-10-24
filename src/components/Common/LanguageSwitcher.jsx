import { useState } from "react";
import { useTranslation } from "react-i18next";

// Windows không vẽ được emoji cờ (chỉ hiện chữ "GB", "VN") nên dùng SVG cho chắc.
const FlagUK = () => (
    <svg className="language-flag" viewBox="0 0 60 40" width="22" height="15" aria-hidden="true">
        <clipPath id="uk-clip"><rect width="60" height="40" rx="3" /></clipPath>
        <g clipPath="url(#uk-clip)">
            <rect width="60" height="40" fill="#012169" />
            <path d="M0 0L60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
            <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
            <path d="M30 0V40M0 20H60" stroke="#fff" strokeWidth="13" />
            <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="8" />
        </g>
    </svg>
);

const FlagVN = () => (
    <svg className="language-flag" viewBox="0 0 60 40" width="22" height="15" aria-hidden="true">
        <clipPath id="vn-clip"><rect width="60" height="40" rx="3" /></clipPath>
        <g clipPath="url(#vn-clip)">
            <rect width="60" height="40" fill="#DA251D" />
            <polygon
                fill="#FFFF00"
                points="30,8 33.5,17.8 43.9,18.1 35.6,24.4 38.5,34.4 30,28.5 21.5,34.4 24.4,24.4 16.1,18.1 26.5,17.8"
            />
        </g>
    </svg>
);

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
                        <FlagUK />
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
                        <FlagVN />
                        <span>Tiếng Việt</span>
                    </button>
                </div>
            )}
        </div>
    );
}