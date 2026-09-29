import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconSearch, IconX } from "../Common/Icons";

export default function SearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    if (v.trim()) {
      navigate(`/search?q=${encodeURIComponent(v.trim())}`);
    } else if (location.pathname.startsWith("/search")) {
      navigate("/search");
    }
  };

  return (
    <div className="search-bar">
      <IconSearch className="search-icon" />
      <input
        type="text"
        placeholder={t("search.placeholder")}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button className="search-clear" onClick={() => { setValue(""); navigate("/search"); }}>
          <IconX />
        </button>
      )}
    </div>
  );
}
