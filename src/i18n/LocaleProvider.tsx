"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { messages, type Locale, type MessageKey } from "./messages";
const Context = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}>({ locale: "sq", setLocale: () => {}, t: (key) => messages.sq[key] });
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("sq");
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved === "en" || saved === "sq") setLocaleState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem("locale", next);
    document.cookie = `locale=${next};path=/;max-age=31536000;SameSite=Lax`;
  }
  return (
    <Context.Provider
      value={{ locale, setLocale, t: (key) => messages[locale][key] }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLocale = () => useContext(Context);
export function LanguagePicker() {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className="language-picker">
      {t("language")}{" "}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        <option value="sq">Shqip</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
