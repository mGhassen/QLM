import type { DocDocument } from "./types";

export const DOC_VERSION_FLOW = 2;

export function isFlowDoc(document: DocDocument): boolean {
  return document.version >= DOC_VERSION_FLOW || document.body !== undefined;
}

export function docBody(document: DocDocument): string {
  return document.body ?? "";
}
