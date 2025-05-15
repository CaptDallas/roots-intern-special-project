'use client';  // Next 13+ App Router; omit for pages/

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { DrawCreateEvent } from '@mapbox/mapbox-gl-draw';
import ReactMapGL, { Source, Layer, MapRef, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection, Point as GeoJSONPoint, Feature, Polygon } from 'geojson';
import type { MapMouseEvent } from 'mapbox-gl';
import { Listing, SearchResult } from '@/types';
import { ListingPopup } from './ListingPopup';
import { MAP_LAYERS, MAP_CONFIG } from '../app/styles/mapStyles';
import PolygonLayer from './PolygonLayer';
import { COLORS } from '../app/styles/theme';

interface InteractiveMapProps {
  onPolygonChange?: (polygon: Feature | null, action?: 'create' | 'delete' | 'clear') => void;
  searchResults: SearchResult[]; // These are the polygon clusters/searches
  currentDrawing?: Feature<Polygon>[];
  onEnableDrawingRef?: React.MutableRefObject<(() => boolean) | null>;
  activeSearchIndex?: number;
}

type HoveredPoint = {
  longitude: number;
  latitude: number;
  properties: any;
  originalListing?: Listing;
} | null;

// For drawn regions
const REGION_COLOR_KEYS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];

// Helper function to debounce things like popups
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}


function usePolygonDrawing(
  mapRef: React.RefObject<MapRef | null>,
  onPolygonChange?: (polygon: Feature | null, action?: 'create' | 'delete' | 'clear') => void,
  colorKey: string = 'alpha'
) {
  const drawRef = useRef<MapboxDraw | null>(null);

  const getDrawStyles = useCallback(() => {
    const colorObj = COLORS.region[colorKey as keyof typeof COLORS.region] || COLORS.region.alpha;
    
    return [
      {
        id: 'gl-draw-line',
        type: 'line',
        filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
        paint: {
          'line-color': colorObj.dark,
          'line-width': 2.5,
          'line-dasharray': [2, 1]
        }
      },
      {
        id: 'gl-draw-polygon-fill',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
          'fill-color': colorObj.main,
          'fill-outline-color': colorObj.dark,
          'fill-opacity': 0.3
        }
      },
      {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
          'line-color': colorObj.dark,
          'line-width': 3,
          'line-dasharray': [2, 1]
        }
      },
      {
        id: 'gl-draw-point-point-stroke-active',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-color': colorObj.dark,
          'circle-stroke-width': 2
        }
      }
    ];
  }, []);

  const enableDrawingMode = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
      return true;
    }
    return false;
  }, []);

  const handleCreate = (e: DrawCreateEvent) => {
    if (!drawRef.current) return;
    
    const feature = e.features[0] ?? null;
    if (!feature) return;
    
    onPolygonChange?.(feature, 'create');
    
    // Get rid of the draw after we've captured the polygon
    if (drawRef.current) {
      drawRef.current.delete(feature.id as string);
      setTimeout(() => {
        if (drawRef.current) {
          drawRef.current.changeMode('draw_polygon');
        }
      }, 50);
    }
  };

  // Clear current drawings
  const clearAllDrawings = useCallback(() => {
    if (drawRef.current) {
      const allFeatures = drawRef.current.getAll();
      if (allFeatures.features.length > 0) {
        allFeatures.features.forEach(feature => {
          drawRef.current?.delete(feature.id as string);
        });
        onPolygonChange?.(null, 'clear');
        
        setTimeout(() => {
          if (drawRef.current) {
            drawRef.current.changeMode('draw_polygon');
          }
        }, 50);
      }
    }
  }, [onPolygonChange]);

  const onMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false,
        combine_features: false,
        uncombine_features: false
      },
      defaultMode: 'draw_polygon',
      styles: getDrawStyles()
    });
    map.addControl(drawRef.current);

    map.on('draw.create', handleCreate);
  };
  return { onMapLoad, clearAllDrawings, enableDrawingMode };
}

function useListingsData(listings: Listing[]) {
  const geoJsonData = useMemo<FeatureCollection<GeoJSONPoint>>(() => ({
    type: 'FeatureCollection',
    features: Array.isArray(listings) ? listings.map((listing: Listing) => ({
      type: 'Feature',
      properties: {
        id: listing.id,
        address: listing.address,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        squareFeet: listing.squareFeet,
        propertyType: listing.propertyType,
        status: listing.status,
        isAssumable: listing.isAssumable
      },
      geometry: { 
        type: 'Point', 
        coordinates: [listing.longitude, listing.latitude] 
      }
    })) : []
  }), [listings]);

  const listingsMap = useMemo(() => {
    const map = new Map<string, Listing>();
    if (Array.isArray(listings)) {
      listings.forEach(listing => {
        if (listing.id) {
          map.set(listing.id, listing);
        }
      });
    }
    return map;
  }, [listings]);

  return { geoJsonData, listingsMap };
}

/**
 * InteractiveMap Component
 * 
 * The core map visualization component responsible for rendering polygon search regions
 * and property listings. Uses Mapbox GL JS (via react-map-gl)
 * 
 * Features:
 * - Renders property listings as points on the map with clustering
 * - Displays search region polygons from search history
 * - Provides polygon drawing functionality for defining search areas
 * - Popups with listing information on hover
 * 
 * It uses a few custom hooks mostly for handling the complex drawing functionality:
 * - usePolygonDrawing: For polygon drawing functionality
 * - useListingsData: For converting listing data to GeoJSON format
 * 
 * @param {Function} onPolygonChange - Callback when polygons change
 * @param {SearchResult[]} searchResults - Array of all search results with polygons and listings
 * @param {Feature<Polygon>[]} currentDrawing - Currently drawn polygons (not in searched but still rendered)
 * @param {React.MutableRefObject} onEnableDrawingRef - Ref for parent component to enable drawing mode
 * @param {number} activeSearchIndex - Index of the active search result to display listings for
 * 
 * @returns {JSX.Element} The interactive map with all visualization elements
 */
export default function InteractiveMap({ 
  onPolygonChange, 
  searchResults = [],
  currentDrawing = [],
  onEnableDrawingRef,
  activeSearchIndex = 0
}: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);

  
  const activeListings = useMemo(() => {
    if (searchResults.length === 0) return [];
    return searchResults[activeSearchIndex]?.listings || [];
  }, [searchResults, activeSearchIndex]);
  
  const nextColorKey = useMemo(() => {
    const colorIndex = Math.min(searchResults.length, REGION_COLOR_KEYS.length - 1);
    return REGION_COLOR_KEYS[colorIndex];
  }, [searchResults.length]);
  
  const { onMapLoad, enableDrawingMode } = usePolygonDrawing(
    mapRef, 
    onPolygonChange,
  );
  
  const { geoJsonData, listingsMap } = useListingsData(activeListings);

  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint>(null);
  const [hoveredId, setHoveredId] = useState<string>('');

  const debouncedSetHoveredPoint = useCallback(
    debounce((point: HoveredPoint) => {
      setHoveredPoint(point);
    }, 50),
    []
  );

  const debouncedSetHoveredId = useCallback(
    debounce((id: string) => {
      setHoveredId(id);
    }, 50),
    []
  );

  useEffect(() => {
    if (mapRef.current && mapRef.current.getMap()) {
      const map = mapRef.current.getMap();
      
      map.getCanvas().setAttribute('willReadFrequently', 'true');
    }
  }, []);

  // This exposes the drawing method to the Map Container
  useEffect(() => {
    if (onEnableDrawingRef) {
      onEnableDrawingRef.current = enableDrawingMode;
    }
    return () => {
      if (onEnableDrawingRef) {
        onEnableDrawingRef.current = null;
      }
    };
  }, [enableDrawingMode, onEnableDrawingRef]);

  const handleMouseEnter = useCallback((e: MapMouseEvent) => {
    if (!e.features?.length) return;
    
    const feature = e.features[0];
    if (!feature.properties || feature.properties.point_count) return;
    
    const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    if (!coordinates || !feature.properties.id) return;
    
    const originalListing = listingsMap.get(feature.properties.id);
    
    debouncedSetHoveredId(feature.properties.id);
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setFilter('highlighted-point', ['==', 'id', feature.properties.id]);
    }
    
    debouncedSetHoveredPoint({
      longitude: coordinates[0],
      latitude: coordinates[1],
      properties: { ...feature.properties },
      originalListing
    });
  }, [listingsMap, debouncedSetHoveredPoint, debouncedSetHoveredId]);

  const handleMouseLeave = useCallback(() => {
    debouncedSetHoveredPoint(null);
    debouncedSetHoveredId('');
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setFilter('highlighted-point', ['==', 'id', '']);
    }
  }, [debouncedSetHoveredPoint, debouncedSetHoveredId]);

  const interactiveLayerIds = useMemo(() => ['unclustered-point', 'clusters'], []);

  const optimizedClusterLayer = useMemo(() => {
    const layer = { ...MAP_LAYERS.clusterLayer };
    layer.paint = {
      ...layer.paint,
      'circle-color': [
        'step',
        ['get', 'point_count'],
        COLORS.brand.green,
        50, COLORS.brand.green,
        100, COLORS.region.alpha.main
      ]
    };
    return layer;
  }, []);

  return (
    <ReactMapGL
      ref={mapRef}
      initialViewState={{
        longitude: (activeListings && activeListings.length > 0) ? activeListings[0]?.longitude ?? MAP_CONFIG.defaultLongitude : MAP_CONFIG.defaultLongitude,
        latitude: (activeListings && activeListings.length > 0) ? activeListings[0]?.latitude ?? MAP_CONFIG.defaultLatitude : MAP_CONFIG.defaultLatitude,
        zoom: MAP_CONFIG.initialZoom
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_CONFIG.mapStyle}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
      attributionControl={false}
      onLoad={onMapLoad}
      interactiveLayerIds={interactiveLayerIds}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      maxZoom={19}
      minZoom={3}
      renderWorldCopies={false}
      keyboard={false}
    >
      
      {/* Polygon Layer - displays search result polygons */}
      <PolygonLayer 
        searchResults={searchResults}
        currentDrawing={currentDrawing}
      />
      
      {/* Map Data Source */}
      <Source
        id="points"
        type="geojson"
        data={geoJsonData}
        cluster={true}
        clusterMaxZoom={16}
        clusterRadius={40}
        clusterProperties={{
          sum_price: ['+', ['get', 'price']],
          assumable_count: ['+', ['case', ['get', 'isAssumable'], 1, 0]],
        }}
      >
        <Layer {...optimizedClusterLayer} />
        <Layer {...MAP_LAYERS.clusterCountLayer} />
        <Layer {...MAP_LAYERS.unclusteredPointLayer} />
        <Layer {...MAP_LAYERS.highlightedPointLayer} />
      </Source>

      {/* Popup for hovered point */}
      {hoveredPoint && (
        <ListingPopup 
          point={hoveredPoint} 
          onClose={handleMouseLeave} 
        />
      )}
    </ReactMapGL>
  );
}