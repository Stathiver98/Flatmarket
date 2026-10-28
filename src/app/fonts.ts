import localFont from "next/font/local";

// Self-hosted OFL fonts with full Greek coverage (see src/fonts/LICENSE.md).
export const commissioner = localFont({
  src: [
    { path: "../fonts/Commissioner_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Commissioner_500Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Commissioner_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Commissioner_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-commissioner",
  display: "swap",
});

export const notoSerifDisplay = localFont({
  src: [
    { path: "../fonts/NotoSerifDisplay_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/NotoSerifDisplay_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "../fonts/NotoSerifDisplay_500Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-noto-serif-display",
  display: "swap",
});
