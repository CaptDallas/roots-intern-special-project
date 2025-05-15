'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Feature, Polygon } from 'geojson';
import { Button, HStack, Box } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { SearchResult } from '@/types';
import { SHADOWS } from '@/app/styles/theme';

const BUTTON_SHADOW = SHADOWS.md;

const InteractiveMap = dynamic(
  () => import('./InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

interface MapContainerProps {
  searchResults: SearchResult[];
  onSearchRegion: (polygons: Feature<Polygon>[]) => Promise<void>;
  activeSearchIndex: number;
}

/**
 * MapContainer Component
 * 
 * Manages polygon drawing state and the tools for drawing and searching a polygon region.
 * Acts as a layer between the Page and the InteractiveMap.
 * 
 * Features:
 * - Drawing state for polygons (creation, clearing)
 * - Buttons for re-enabling drawing mode, searching, and clearing
 * - Feeds data to the InteractiveMap for visualization
 * 
 * @param {SearchResult[]} searchResults - Array of all search results (polygon regions)
 * @param {Function} onSearchRegion - Callback function to execute search with drawn polygons
 * @param {number} activeSearchIndex - Index of the currently active search result
 * 
 * @returns {JSX.Element} Container with map and drawing controls
 */
export default function MapContainer({
  searchResults,
  onSearchRegion,
  activeSearchIndex
}: MapContainerProps) {
  const [drawingPolygons, setDrawingPolygons] = useState<Feature<Polygon>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const enableDrawingRef = useRef<(() => boolean) | null>(null);

  // To be passed to the map component
  const handlePolygonChange = useCallback((polygon: Feature | null, action?: 'create' | 'delete' | 'clear') => {
    if (action === 'create' && polygon && polygon.geometry.type === 'Polygon') {
      setDrawingPolygons(prev => [...prev, polygon as Feature<Polygon>]);
    } else if (action === 'delete' && polygon) {
      setDrawingPolygons(prev => prev.filter(p => p.id !== polygon.id));
    } else if (action === 'clear') {
      setDrawingPolygons([]);
    }
  }, []);
  
  const enableDrawing = useCallback(() => {
    if (enableDrawingRef.current) {
      enableDrawingRef.current();
    }
  }, []);
  
  const handleSearch = useCallback(async () => {
    if (drawingPolygons.length === 0) return;
    
    setIsLoading(true);
    
    try {
      await onSearchRegion(drawingPolygons); // Making this async keeps the polygon rendered during search
      
      setDrawingPolygons([]);
      
      setTimeout(() => {
        enableDrawing();
      }, 100);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [drawingPolygons, onSearchRegion, enableDrawing]);
  
  const clearDrawings = useCallback(() => {
    setDrawingPolygons([]);
  }, []);
  
  return (
    <Box position="relative" width="100%" height="100%">
      <InteractiveMap
        searchResults={searchResults}
        onPolygonChange={handlePolygonChange}
        currentDrawing={drawingPolygons}
        onEnableDrawingRef={enableDrawingRef}
        activeSearchIndex={activeSearchIndex}
      />
      
      {/* Floating controls for polygon drawing */}
      <HStack 
        position="absolute" 
        top="90px" 
        right="10px" 
        gap={2} 
        zIndex={10}
      >
        <Button
          size="md"
          colorScheme="green"
          variant="solid"
          onClick={enableDrawing}
          boxShadow={BUTTON_SHADOW}
          _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
        >
          Draw Tool
        </Button>

        {drawingPolygons.length > 0 && (
          <>
            <Button
              size="md"
              colorScheme="green"
              onClick={handleSearch}
              disabled={isLoading}
              boxShadow={BUTTON_SHADOW}
              _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
            >
              {isLoading ? 'Searching...' : 'Search Region'}
            </Button>
            
            <Button
              size="md"
              colorScheme="red"
              variant="outline"
              onClick={clearDrawings}
              boxShadow={BUTTON_SHADOW}
              _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
            >
              Clear
            </Button>
          </>
        )}
      </HStack>
    </Box>
  );
} 