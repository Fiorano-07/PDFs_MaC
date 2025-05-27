"use client"

import React, { useState } from 'react'
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf'
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Loader2 } from 'lucide-react'
import { PDFViewerComponent, PDFViewerProps } from './pdf-viewer-types'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export const PDFViewer: PDFViewerComponent = ({ url, pageNumber, scale, onLoadSuccess, onLoadError }) => {
  const [isLoading, setIsLoading] = useState(true);

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-blue-500 text-lg">Loading PDF...</p>
    </div>
  );

  return (
    <div className="flex justify-center bg-gray-50 rounded-lg overflow-auto min-h-[calc(100vh-250px)] lg:min-h-[600px]">
      <PDFDocument
        file={url}
        onLoadSuccess={(pdf) => {
          setIsLoading(false);
          onLoadSuccess(pdf.numPages);
        }}
        onLoadError={(error) => {
          setIsLoading(false);
          onLoadError(error);
        }}
        loading={<LoadingSpinner />}
        error={
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-center p-4">
            <p className="text-gray-600 text-lg">Loading PDF viewer...</p>
            <LoadingSpinner />
            <p className="text-gray-500 text-sm">This might take a moment. Please wait...</p>
          </div>
        }
        options={{
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        }}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <PDFPage
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg"
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={<LoadingSpinner />}
          />
        )}
      </PDFDocument>
    </div>
  )
} 