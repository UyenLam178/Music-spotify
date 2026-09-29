import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import vi from "./vi";
import en from "./en";

const getInitialLanguage = () => {
    const saved =
        localStorage.getItem("language");

    if (saved === "en" || saved === "vi") {
        return saved;
    }

    return "vi";
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            vi: {
                translation: vi,
            },

            en: {
                translation: en,
            },
        },

        lng: getInitialLanguage(),
        fallbackLng: "en",

        interpolation: {
            escapeValue: false,
        },

        react: {
            useSuspense: false,
        },
    });

export default i18n;