import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { Feature, Polygon, FeatureCollection } from 'geojson';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/mapbox';
import { COLORS } from '@/app/styles/theme';
import { SearchResult } from '@/types';

// Define base polygon style
const BASE_STYLE = {
  fillOpacity: 0.2,
  outlineWidth: 2,
  outlineDasharray: [1]
};

// Style for currently drawn (unsearched) polygons - uses same color as assigned but enhanced
const CURRENT_DRAWING_STYLE = {
  fillOpacity: 0.4,       // Higher opacity for better visibility
  outlineWidth: 3.5,      // Thicker outline
  outlineDasharray: [1]
};

// The region color keys in order of assignment
const REGION_COLOR_KEYS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];

interface PolygonLayerProps {
  currentDrawing?: Feature<Polygon>[];
  searchResults: SearchResult[];
  onPolygonClick?: (polygon: Feature<Polygon>, searchResultIndex: number) => void;
}

export default function PolygonLayer({ 
  currentDrawing = [],
  searchResults = [], 
  onPolygonClick
}: PolygonLayerProps) {
  // Process all polygons with their search index and assign colors
  const processedPolygons = useMemo(() => {
    let allPolygons: Array<{
      polygon: Feature<Polygon>;
      searchIndex: number;
      colorKey: string;
      isCurrentDrawing: boolean;
    }> = [];
    
    // Reverse the search results to assign colors correctly (oldest -> alpha, newer -> beta, gamma, etc.)
    // Since searchResults is already newest first, we need to reverse it for color assignment
    const reversedResults = [...searchResults].reverse();
    
    // Calculate what color the next region should be (to be used for current drawing)
    // This is based on how many existing searches we have
    const nextColorIndex = Math.min(reversedResults.length, REGION_COLOR_KEYS.length - 1);
    const nextColorKey = REGION_COLOR_KEYS[nextColorIndex];
    
    // Add current drawing polygons first - use the next color in sequence
    const currentDrawingPolygons = currentDrawing.map(polygon => ({
      polygon: {
        ...polygon,
        properties: {
          ...polygon.properties,
          isCurrentDrawing: true,
          colorKey: nextColorKey  // Use the next color based on existing search count
        }
      },
      searchIndex: -1,  // Special index for current drawing
      colorKey: nextColorKey,
      isCurrentDrawing: true
    }));
    
    allPolygons = [...currentDrawingPolygons];
    
    // Process each search result's polygons - oldest gets alpha
    reversedResults.forEach((result, index) => {
      if (!result.polygons || result.polygons.length === 0) return;
      
      // Calculate color index - oldest gets alpha (index 0)
      const colorIndex = Math.min(index, REGION_COLOR_KEYS.length - 1);
      const colorKey = REGION_COLOR_KEYS[colorIndex];
      
      const searchPolygons = result.polygons.map(polygon => ({
        polygon: {
          ...polygon,
          properties: {
            ...polygon.properties,
            searchIndex: searchResults.length - 1 - index, // Restore original index for later reference
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
  
  // Convert to GeoJSON feature collection
  const polygonData = useMemo((): FeatureCollection<Polygon> => {
    return {
      type: 'FeatureCollection',
      features: processedPolygons.map(item => item.polygon)
    };
  }, [processedPolygons]);

  // Define the polygon fill layer with dynamic coloring based on color key
  const polygonFillLayer: FillLayerSpecification = {
    id: 'polygon-fill',
    type: 'fill',
    source: 'polygon-source',
    paint: {
      // Use the colorKey property to determine the fill color
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
        // Default to brand color if no match
        COLORS.brand.green
      ],
      // Use higher opacity for current drawing
      'fill-opacity': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.fillOpacity,
        BASE_STYLE.fillOpacity
      ]
    }
  };

  // Define the polygon outline layer
  const polygonOutlineLayer: LineLayerSpecification = {
    id: 'polygon-outline',
    type: 'line',
    source: 'polygon-source',
    paint: {
      // Use the colorKey property to determine the outline color (darker version)
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
        // Default to brand color if no match
        COLORS.brand.greenDark
      ],
      // Use thicker outline for current drawing
      'line-width': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.outlineWidth,
        BASE_STYLE.outlineWidth
      ],
      // Use dashed line for current drawing
      'line-dasharray': [
        'case',
        ['==', ['get', 'isCurrentDrawing'], true], CURRENT_DRAWING_STYLE.outlineDasharray,
        ['literal', [1]]
      ]
    }
  };

  // Handle polygon click
  const handleClick = (e: any) => {
    if (onPolygonClick && e.features && e.features.length > 0) {
      const feature = e.features[0];
      const searchIndex = feature.properties?.searchIndex ?? 0;
      onPolygonClick(feature, searchIndex);
    }
  };

  // If there are no polygons, don't render anything
  if (processedPolygons.length === 0) return null;

  return (
    <Source id="polygon-source" type="geojson" data={polygonData}>
      <Layer {...polygonFillLayer} />
      <Layer {...polygonOutlineLayer} />
    </Source>
  );
} 