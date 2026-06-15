import type { DocDocument } from "../types";

export type ImportAsset = {
  filename: string;
  buffer: Buffer;
  contentType: string;
};

export type ImportResult = {
  title: string;
  document: DocDocument;
  sections: Record<string, string>;
  assets: ImportAsset[];
};

export const IMPORT_ASSET_PREFIX = "__import__/";
