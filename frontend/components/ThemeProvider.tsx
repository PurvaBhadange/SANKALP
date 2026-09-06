"use client";

import React, { createContext, useContext, useEffect } from "react";

export type ThemeMode = "thub";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "thub",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "thub");
    localStorage.setItem("sankalp_theme", "thub");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "thub", setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
