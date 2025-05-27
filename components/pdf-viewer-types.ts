import { FC } from 'react';

export interface PDFViewerProps {
  url: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (error: Error) => void;
}

export type PDFViewerComponent = FC<PDFViewerProps>; 