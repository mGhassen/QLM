import type { BlockNode, DocDocument } from './types';
import { DOC_VERSION_FLOW } from './flow-doc';
import { createStarterPage } from './studio-document';
import { isCoverSection } from './section-variant';

function updateCoverTitleIfMatches(
  block: BlockNode,
  prevTitle: string,
  nextTitle: string,
): BlockNode {
  if (
    block.type === 'subheading' &&
    block.props?.level === 1 &&
    block.content === prevTitle
  ) {
    return { ...block, content: nextTitle };
  }
  if (block.children) {
    return {
      ...block,
      children: block.children.map((child) =>
        updateCoverTitleIfMatches(child, prevTitle, nextTitle),
      ),
    };
  }
  return block;
}

function updateCoverSectionTitle(
  block: BlockNode,
  prevTitle: string,
  nextTitle: string,
): BlockNode {
  if (block.type === 'page' && block.children) {
    return {
      ...block,
      children: block.children.map((child) =>
        isCoverSection(child)
          ? updateCoverTitleIfMatches(child, prevTitle, nextTitle)
          : child,
      ),
    };
  }
  if (block.type === 'cover') {
    return updateCoverTitleIfMatches(block, prevTitle, nextTitle);
  }
  return block;
}

export function applyDocTitle(
  document: DocDocument,
  prevTitle: string,
  nextTitle: string,
): DocDocument {
  let chrome = document.chrome;
  if (chrome?.headerLeft === prevTitle) {
    chrome = { ...chrome, headerLeft: nextTitle };
  }

  return {
    ...document,
    chrome,
    blocks: document.blocks.map((block) =>
      updateCoverSectionTitle(block, prevTitle, nextTitle),
    ),
  };
}

export function createDefaultDocument(_title: string): {
  document: DocDocument;
  sections: Record<string, string>;
} {
  return {
    document: {
      version: DOC_VERSION_FLOW,
      layoutMode: 'paginated',
      pageFormat: 'a4',
      chrome: {
        headerEnabled: false,
        footerEnabled: false,
      },
      blocks: [createStarterPage()],
    },
    sections: {},
  };
}
