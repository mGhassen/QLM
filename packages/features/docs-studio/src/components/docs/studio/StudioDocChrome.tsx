"use client";

import type { ChromeZoneId } from "#/lib/types";
import type { ResolvedChrome } from "#/lib/chrome";
import DocPageChrome from "../DocPageChrome";

interface StudioDocChromeProps {
  chrome: ResolvedChrome;
  position: "header" | "footer";
  activeZone?: ChromeZoneId | null;
  onZoneSelect?: (zone: ChromeZoneId) => void;
}

export default function StudioDocChrome({
  chrome,
  position,
  activeZone,
  onZoneSelect,
}: StudioDocChromeProps) {
  return (
    <DocPageChrome
      chrome={chrome}
      position={position}
      studioMode
      activeZone={activeZone}
      onZoneSelect={onZoneSelect}
    />
  );
}
