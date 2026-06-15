import type { CSSProperties } from "react";
import type { ChromeZoneId } from "#/lib/types";
import { chromeZoneToStyle, type ResolvedChrome } from "#/lib/chrome";

interface DocPageChromeProps {
  chrome: ResolvedChrome;
  position: "header" | "footer";
  studioMode?: boolean;
  activeZone?: ChromeZoneId | null;
  onZoneSelect?: (zone: ChromeZoneId) => void;
}

function ChromeZone({
  zone,
  html,
  chromeStyle,
  studioMode,
  active,
  onSelect,
}: {
  zone: ChromeZoneId;
  html: string;
  chromeStyle?: ResolvedChrome["style"];
  studioMode?: boolean;
  active?: boolean;
  onSelect?: (zone: ChromeZoneId) => void;
}) {
  if (!html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return <span className="doc-chrome-zone doc-chrome-zone--empty" />;

  const style = chromeZoneToStyle(zone, chromeStyle);
  const className = [
    "doc-chrome-zone",
    `doc-chrome-zone--${zone}`,
    studioMode ? "doc-chrome-zone--studio" : "",
    active ? "studio-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={style as CSSProperties}
      data-chrome-zone={zone}
      onClick={
        studioMode && onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(zone);
            }
          : undefined
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function DocPageChrome({
  chrome,
  position,
  studioMode,
  activeZone,
  onZoneSelect,
}: DocPageChromeProps) {
  if (position === "header") {
    if (!chrome.showHeader) return null;
    return (
      <div className={`doc-chrome-header${studioMode ? " doc-chrome-header--studio" : ""}`}>
        <ChromeZone
          zone="headerLeft"
          html={chrome.headerLeftHtml}
          chromeStyle={chrome.style}
          studioMode={studioMode}
          active={activeZone === "headerLeft"}
          onSelect={onZoneSelect}
        />
        <ChromeZone
          zone="headerRight"
          html={chrome.headerRightHtml}
          chromeStyle={chrome.style}
          studioMode={studioMode}
          active={activeZone === "headerRight"}
          onSelect={onZoneSelect}
        />
      </div>
    );
  }

  if (!chrome.showFooter) return null;
  return (
    <div className={`doc-chrome-footer${studioMode ? " doc-chrome-footer--studio" : ""}`}>
      <ChromeZone
        zone="footerLeft"
        html={chrome.footerLeftHtml}
        chromeStyle={chrome.style}
        studioMode={studioMode}
        active={activeZone === "footerLeft"}
        onSelect={onZoneSelect}
      />
      <ChromeZone
        zone="footerRight"
        html={chrome.footerRightHtml}
        chromeStyle={chrome.style}
        studioMode={studioMode}
        active={activeZone === "footerRight"}
        onSelect={onZoneSelect}
      />
    </div>
  );
}
