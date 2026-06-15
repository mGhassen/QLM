export {
  createNewDocAction,
  deleteDocAction,
  importDocAction,
} from './actions';
export { docsPaths, projectStudioRoute } from './paths';
export {
  StudioShellProvider,
  useStudioShell,
  type StudioShellContextValue,
} from './studio-shell-context';
export {
  DocsLayout,
  DocsPreviewPage,
  DocsStudioPage,
  DocsStudioRedirect,
} from './components/pages';
export { default as DocStudio } from './components/docs/studio/DocStudio';
export type { DocStudioProps } from './components/docs/studio/DocStudio';
export { default as DocLayout } from './components/docs/DocLayout';
export type { DocStudioActions } from './types/actions';
export { themeToStyle } from './lib/theme';
export { prepareStudioDocument } from './lib/studio-document';
export {
  createDoc,
  deleteDoc,
  generateUniqueSlug,
  getAllDocs,
  loadDoc,
  saveDoc,
} from './lib/loader';
export type {
  BlockNode,
  DocDocument,
  DocListItem,
  DocMeta,
  LoadedDoc,
} from './lib/types';
