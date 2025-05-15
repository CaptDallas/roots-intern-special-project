import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { Feature, Polygon, FeatureCollection } from 'geojson';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/mapbox';
import { COLORS } from '@/app/styles/theme';
import { SearchResult } from '@/types';

const BASE_STYLE = {
  fillOpacity: 0.2,
  outlineWidth: 2,
  outlineDasharray: [1]
};

const CURRENT_DRAWING_STYLE = {
  fillOpacity: 0.4,
  outlineWidth: 3.5,
  outlineDasharray: [1, 8]
};
// These code the colors for each of the polygon clusters/ searches.
const REGION_COLOR_KEYS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];

interface PolygonLayerProps {
  currentDrawing?: Feature<Polygon>[];
  searchResults: SearchResult[];
  onPolygonClick?: (polygon: Feature<Polygon>, searchResultIndex: number) => void;
}

/**
 * PolygonLayer Component
 * 
 * Renders all polygon regions in the application, both from search history and current drawing.
 * This component processes and styles polygons with different colors based on their search index
 * 
 * Features:
 * - Renders all search history polygons with distinct and consistent colors
 * - Renders current drawing polygons with special styling (thicker outline, dashed lines)
 * - Uses color coding to visually distinguish between different search regions
 * 
 * Combines all search polygons and the current drawing into a single GeoJSON FeatureCollection for efficient rendering.
 * 
 * @param {Feature<Polygon>[]} currentDrawing - Currently drawn polygons (not searched)
 * @param {SearchResult[]} searchResults - Array of all search results containing polygons
 * 
 * @returns {JSX.Element|null} The polygon layers or null if no polygons to render
 */
export default function PolygonLayer({ 
  currentDrawing = [],
  searchResults = [], 
}: PolygonLayerProps) {
  const processedPolygons = useMemo(() => {
    let allPolygons: Array<{
      polygon: Feature<Polygon>;
      searchIndex: number;
      colorKey: string;
      isCurrentDrawing: boolean;
    }> = [];
    
    // Reversing makes colors assignment easier
    const reversedResults = [...searchResults].reverse();
    // min accounts for too many searches
    const nextColorIndex = Math.min(reversedResults.length, REGION_COLOR_KEYS.length - 1);
    const nextColorKey = REGION_COLOR_KEYS[nextColorIndex];
    
    const currentDrawingPolygons = currentDrawing.map(polygon => ({
      polygon: {
        ...polygon,
        properties: {
          ...polygon.properties,
          isCurrentDrawing: true,
          colorKey: nextColorKey
        }
      },
      searchIndex: -1,
      colorKey: nextColorKey,
      isCurrentDrawing: true
    }));
    
    allPolygons = [...currentDrawingPolygons];
    
    reversedResults.forEach((result, index) => {
      if (!result.polygons || result.polygons.length === 0) return;
      
      const colorIndex = Math.min(index, REGION_COLOR_KEYS.length - 1);
      const colorKey = REGION_COLOR_KEYS[colorIndex];
      
      const searchPolygons = result.polygons.map(polygon => ({
        polygon: {
          ...polygon,
          properties: {
            ...polygon.properties,
            searchIndex: searchResults.length - 1 - index,
            colorKey: colorKey,
            isCurrentDrawing: false
          }
        },
        searchIndex: searchResults.length - 1 - index,
        colorKey: colorKey,
        isCurrentDrawing: false
      }));
      
      allPolygons = [...allPolygons, ...searchPolygons];
    });
    
    return allPolygons;
  }, [searchResults, currentDrawing]);
  
  const polygonData = useMemo((): FeatureCollection<Polygon> => {
    return {
      type: 'FeatureCollection',
      features: processedPolygons.map(item => item.polygon)
    };
  }, [processedPolygons]);

  // color key is used here
  const polygonFillLayer: FillLayerSpecification = {
    id: 'polygon-fill',
    type: 'fill',
    source: 'polygon-source',
    paint: {
      'fill-color': [
        'match',
        ['get', 'colorKey'],
        'alpha', COLORS.region.alpha.main,
        'beta', COLORS.region.beta.main,
        'gamma', COLORS.region.gamma.main,
        'delta', COLORS.region.delta.main,
        'epsilon', COLORS.region.epsilon.main,
        'zeta', COLORS.region.zeta.main,
        'eta', COLORS.region.eta.main,
        'theta', COLORS.region.theta.main,
        COLORS.brand.green
      ],
      'fill-opacity': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.fillOpacity,
        BASE_STYLE.fillOpacity
      ]
    }
  };

  const polygonOutlineLayer: LineLayerSpecification = {
    id: 'polygon-outline',
    type: 'line',
    source: 'polygon-source',
    paint: {
      'line-color': [
        'match',
        ['get', 'colorKey'],
        'alpha', COLORS.region.alpha.dark,
        'beta', COLORS.region.beta.dark,
        'gamma', COLORS.region.gamma.dark,
        'delta', COLORS.region.delta.dark,
        'epsilon', COLORS.region.epsilon.dark,
        'zeta', COLORS.region.zeta.dark,
        'eta', COLORS.region.eta.dark,
        'theta', COLORS.region.theta.dark,
        COLORS.brand.greenDark
      ],
      'line-width': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.outlineWidth,
        BASE_STYLE.outlineWidth
      ],
      'line-dasharray': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.outlineDasharray,
        ['literal', [1]]
      ]
    }
  };

  if (processedPolygons.length === 0) return null;

  return (
    <Source id="polygon-source" type="geojson" data={polygonData}>
      <Layer {...polygonFillLayer} />
      <Layer {...polygonOutlineLayer} />
    </Source>
  );
} 