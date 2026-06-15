import type { ComponentType } from 'react';
import Cover from '#/components/docs/blocks/Cover';
import Brand from '#/components/docs/blocks/Brand';
import CoverBody from '#/components/docs/blocks/CoverBody';
import CoverSubtitle from '#/components/docs/blocks/CoverSubtitle';
import CoverToc from '#/components/docs/blocks/CoverToc';
import Section from '#/components/docs/blocks/Section';
import Seclabel from '#/components/docs/blocks/Seclabel';
import Opener from '#/components/docs/blocks/Opener';
import Split from '#/components/docs/blocks/Split';
import Main from '#/components/docs/blocks/Main';
import Rail from '#/components/docs/blocks/Rail';
import Flow from '#/components/docs/blocks/Flow';
import Grid from '#/components/docs/blocks/Grid';
import Box from '#/components/docs/blocks/Box';
import Card from '#/components/docs/blocks/Card';
import Alert from '#/components/docs/blocks/Alert';
import Hero from '#/components/docs/blocks/Hero';
import Table from '#/components/docs/blocks/Table';
import Figure from '#/components/docs/blocks/Figure';
import Phase from '#/components/docs/blocks/Phase';
import Subheading from '#/components/docs/blocks/Subheading';
import Paragraph from '#/components/docs/blocks/Paragraph';
import Quote from '#/components/docs/blocks/Quote';
import Levels from '#/components/docs/blocks/Levels';
import Level from '#/components/docs/blocks/Level';
import LvlCol from '#/components/docs/blocks/LvlCol';
import Vm from '#/components/docs/blocks/Vm';
import VmCol from '#/components/docs/blocks/VmCol';
import LCard from '#/components/docs/blocks/LCard';
import Pat from '#/components/docs/blocks/Pat';
import Engines from '#/components/docs/blocks/Engines';
import KpiBand from '#/components/docs/blocks/KpiBand';
import Kpi from '#/components/docs/blocks/Kpi';
import Break from '#/components/docs/blocks/Break';
import Page from '#/components/docs/blocks/Page';
import type { BlockType } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blockRegistry: Record<BlockType, ComponentType<any>> = {
  page: Page,
  cover: Cover,
  brand: Brand,
  coverBody: CoverBody,
  coverSubt: CoverSubtitle,
  coverToc: CoverToc,
  section: Section,
  seclabel: Seclabel,
  opener: Opener,
  split: Split,
  main: Main,
  rail: Rail,
  flow: Flow,
  grid: Grid,
  box: Box,
  card: Card,
  alert: Alert,
  hero: Hero,
  table: Table,
  figure: Figure,
  phase: Phase,
  subheading: Subheading,
  paragraph: Paragraph,
  quote: Quote,
  levels: Levels,
  level: Level,
  lvlcol: LvlCol,
  vm: Vm,
  vmcol: VmCol,
  lcard: LCard,
  pat: Pat,
  engines: Engines,
  kpiband: KpiBand,
  kpi: Kpi,
  break: Break,
  pull: Quote,
  cquote: Quote,
  raw: Paragraph,
};
