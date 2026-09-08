import type { TextDirection } from '@report/schema';
import type { LayoutElement } from '@report/layout';
import type { InsetsPt } from '@report/layout';

export interface RenderedPage {
  pageNumber: number;
  totalPages: number;
  widthPt: number;
  heightPt: number;
  marginsPt: InsetsPt;
  printableWidthPt: number;
  printableHeightPt: number;
  direction: TextDirection;
  elements: LayoutElement[];
}

export interface RenderedDocument {
  reportName: string;
  version: string;
  totalPages: number;
  pages: RenderedPage[];
}
