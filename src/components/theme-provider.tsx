import React, { createContext, useContext, useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import {
  tokyoNight,
  defaultSettingsTokyoNight,
} from "@uiw/codemirror-theme-tokyo-night";
import {
  tokyoNightDay,
  defaultSettingsTokyoNightDay,
} from "@uiw/codemirror-theme-tokyo-night-day";
import {
  githubDark,
  githubLight,
  defaultSettingsGithubDark,
  defaultSettingsGithubLight,
} from "@uiw/codemirror-theme-github";
import {
  gruvboxDark,
  defaultSettingsGruvboxDark,
} from "@uiw/codemirror-theme-gruvbox-dark";

const themeMap = {
  tokyoNightDay,
  tokyoNight,
  gruvboxDark,
  // gruvboxLight,
  githubDark,
  githubLight,
};

export const themeSettingsMap = {
  tokyoNightDay: {
    ...defaultSettingsTokyoNightDay,
    primary: "#d67d1c",
    name: "Tokyo Night Day",
  },
  tokyoNight: {
    ...defaultSettingsTokyoNight,
    primary: "#ff9e64",
    name: "Tokyo Night",
  },
  gruvboxDark: {
    ...defaultSettingsGruvboxDark,
    primary: "#fb4934",
    name: "Gruvbox",
  },
  githubDark: {
    ...defaultSettingsGithubDark,
    primary: "#79c0ff",
    name: "Github Dark",
  },
  githubLight: {
    ...defaultSettingsGithubLight,
    primary: "#005cc5",
    name: "Github Light",
  },
  // gruvboxLight: { TODO
  //   ...defaultSettingsGruvboxLight,
  //   primary: "#8f3f71",
  //   name: "Gruvbox Light",
  // },
};

type Theme = string;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: string) => void;
};

const initialState: ThemeProviderState = {
  theme: "githubDark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "githubDark",
  storageKey = "sandbox-theme-v1",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = document.querySelector(":root") as any;

    const settings = (themeSettingsMap as any)[theme];

    const bg = convert(settings.background);
    const fg = convert(settings.caret);

    const primary = convert(settings.primary);

    const _bg = tinycolor(settings.background);
    const _caret = tinycolor(settings.caret);

    const muted = _bg.isDark()
      ? convert(_bg.brighten(10).saturate(5).toHex())
      : convert(_bg.darken(5).saturate(10).toHex());
    const mutedFg = _bg.isDark()
      ? convert(_caret.darken(10).desaturate(50).toHex())
      : convert(_caret.lighten(5).desaturate(20).toHex());

    const accent = _bg.isDark()
      ? convert(_bg.saturate(5).toHex())
      : convert(_bg.desaturate(5).toHex());

    root.style.setProperty("--background", bg);
    root.style.setProperty("--foreground", fg);

    root.style.setProperty("--card", bg);
    root.style.setProperty("--card-foreground", fg);

    root.style.setProperty("--popover", bg);
    root.style.setProperty("--popover-foreground", fg);

    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", bg);

    root.style.setProperty("--secondary", mutedFg);
    root.style.setProperty("--secondary-foreground", bg);

    root.style.setProperty("--muted", muted);
    root.style.setProperty("--muted-foreground", mutedFg);

    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-foreground", fg);

    root.style.setProperty("--border", muted);
    root.style.setProperty("--input", muted);
    root.style.setProperty("--ring", muted);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

export const useCalculatedTheme = () => {
  let { theme } = useContext(ThemeProviderContext);

  if (theme === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return (themeMap as any)[theme];
};

function convert(color: string | undefined) {
  const hsl = tinycolor(color).toHsl();
  return `${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}%`;
}
