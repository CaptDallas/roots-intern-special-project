'use client';  // Next 13+ App Router; omit for pages/

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { DrawCreateEvent } from '@mapbox/mapbox-gl-draw';
import ReactMapGL, { Source, Layer, MapRef, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import '../app/styles/mapEffects.css';
import type { FeatureCollection, Point as GeoJSONPoint, Feature, Polygon } from 'geojson';
import type { MapMouseEvent } from 'mapbox-gl';
import { Listing, SearchResult } from '@/types';
import { ListingPopup } from './ListingPopup';
import { MAP_LAYERS, DRAW_STYLES, MAP_CONFIG } from '../app/styles/mapStyles';
import PolygonLayer from './PolygonLayer';
import { COLORS } from '../app/styles/theme';

interface InteractiveMapProps {
  listings: Listing[];
  onPolygonChange?: (polygon: Feature | null, action?: 'create' | 'delete' | 'clear') => void;
  onListingClick?: (listing: Listing) => void;
  searchResults: SearchResult[];
  currentDrawing?: Feature<Polygon>[];
}

type HoveredPoint = {
  longitude: number;
  latitude: number;
  properties: any;
  originalListing?: Listing;
} | null;

// The region color keys in order of assignment
const REGION_COLOR_KEYS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];

// Helper function to debounce frequently called functions
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
  colorKey: string = 'alpha' // Default to alpha if no color specified
) {
  const drawRef = useRef<MapboxDraw | null>(null);

  // Generate dynamic drawing styles based on the current color
  const getDrawStyles = useCallback(() => {
    // Get the color object based on the colorKey
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
  }, [colorKey]);

  // Method to explicitly enable drawing mode
  const enableDrawingMode = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
      return true;
    }
    return false;
  }, []);

  const handleCreate = (e: DrawCreateEvent) => {
    if (!drawRef.current) return;
    
    // Get the created feature
    const feature = e.features[0] ?? null;
    if (!feature) return;
    
    // Notify parent of the change
    onPolygonChange?.(feature, 'create');
    
    // Clear the draw after we've captured the polygon
    // This allows for drawing multiple polygons without them appearing in the UI
    if (drawRef.current) {
      drawRef.current.delete(feature.id as string);
      
      // Set back to drawing mode after a short delay to avoid state conflicts
      setTimeout(() => {
        if (drawRef.current) {
          drawRef.current.changeMode('draw_polygon');
        }
      }, 50);
    }
  };

  // Method to programmatically clear all drawings
  const clearAllDrawings = useCallback(() => {
    if (drawRef.current) {
      const allFeatures = drawRef.current.getAll();
      if (allFeatures.features.length > 0) {
        allFeatures.features.forEach(feature => {
          drawRef.current?.delete(feature.id as string);
        });
        onPolygonChange?.(null, 'clear');
        
        // Reset back to drawing mode after a short delay
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
        // No visible controls - always in polygon draw mode
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
    // We don't need delete handler since we're not showing delete controls
  };

  // Update draw styles when color changes
  useEffect(() => {
    // If drawRef is initialized, update its styles
    if (drawRef.current && mapRef.current?.getMap()) {
      // Unfortunately, MapboxDraw doesn't provide a way to update styles directly
      // We would need to remove and re-add the control, which causes flickering
      // This is a limitation we'll have to live with for now
    }
  }, [colorKey, getDrawStyles]);

  return { onMapLoad, clearAllDrawings, enableDrawingMode };
}

function useListingsData(listings: Listing[]) {
  // Convert listings to GeoJSON format
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
        // Don't include photoUrls in the GeoJSON to reduce memory usage
      },
      geometry: { 
        type: 'Point', 
        coordinates: [listing.longitude, listing.latitude] 
      }
    })) : []
  }), [listings]);

  // Create a lookup map for fast access to original listing data
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

export default function InteractiveMap({ 
  listings, 
  onPolygonChange, 
  onListingClick,
  searchResults = [],
  currentDrawing = [],
  onEnableDrawingRef,
  onFocusRegionRef
}: InteractiveMapProps & { 
  onEnableDrawingRef?: React.MutableRefObject<(() => boolean) | null>,
  onFocusRegionRef?: React.MutableRefObject<((polygons: Feature<Polygon>[]) => void) | null>
}) {
  const mapRef = useRef<MapRef>(null);
  
  // Extract current polygons from the first search result (newest)
  const currentPolygons = useMemo(() => {
    if (searchResults.length === 0) return [];
    return searchResults[0]?.polygons || [];
  }, [searchResults]);
  
  // Determine the next color to use for drawing based on search history length
  const nextColorKey = useMemo(() => {
    const colorIndex = Math.min(searchResults.length, REGION_COLOR_KEYS.length - 1);
    return REGION_COLOR_KEYS[colorIndex];
  }, [searchResults.length]);
  
  // Track whether user has triggered explicit polygon clearing
  const [userClearedPolygons, setUserClearedPolygons] = useState(false);
  
  // Create a wrapped version of onPolygonChange that tracks user clear actions
  const handlePolygonChange = useCallback((polygon: Feature | null, action?: 'create' | 'delete' | 'clear') => {
    if (action === 'clear') {
      setUserClearedPolygons(true);
      
      // Reset the flag after a short delay to allow future drawings
      setTimeout(() => {
        setUserClearedPolygons(false);
      }, 100);
    }
    
    // Pass through to the original handler
    onPolygonChange?.(polygon, action);
  }, [onPolygonChange]);
  
  const { onMapLoad, clearAllDrawings, enableDrawingMode } = usePolygonDrawing(
    mapRef, 
    handlePolygonChange,
    nextColorKey // Pass the color key for the draw styles
  );
  const { geoJsonData, listingsMap } = useListingsData(listings);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint>(null);
  const [hoveredId, setHoveredId] = useState<string>('');

  // Performance optimization: Use a debounced version of setHoveredPoint and setHoveredId
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

  // Performance optimization: Load data in chunks for better initial rendering
  useEffect(() => {
    if (mapRef.current && mapRef.current.getMap()) {
      const map = mapRef.current.getMap();
      
      // Set map performance settings
      map.getCanvas().setAttribute('willReadFrequently', 'true');
    }
  }, []);

  // Function to focus on a specific region (set of polygons)
  const focusOnRegion = useCallback((polygons: Feature<Polygon>[]) => {
    if (!mapRef.current || !polygons.length) return;
    
    const map = mapRef.current.getMap();
    
    // Calculate the bounding box of all polygons
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    
    // Loop through all polygons and their coordinates to find the bounds
    polygons.forEach(polygon => {
      const coordinates = polygon.geometry.coordinates;
      
      // Polygons have coordinates as [[[lng, lat], [lng, lat], ...]] (array of linear rings)
      coordinates.forEach(ring => {
        ring.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      });
    });
    
    // Calculate center point of the bounding box
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    // Calculate appropriate zoom level based on the bounds
    // This is a simplified calculation - it aims to show the entire region with some padding
    const lngDelta = Math.abs(maxLng - minLng);
    const latDelta = Math.abs(maxLat - minLat);
    
    // Larger of the two deltas determines zoom (smaller zoom value = more zoomed out)
    // Converting degrees to approximate zoom level with padding
    const maxDelta = Math.max(lngDelta, latDelta);
    let zoomLevel = 14; // Default zoom level
    
    // Simple heuristic to determine zoom level based on size of the region
    if (maxDelta > 0.3) zoomLevel = 9;
    else if (maxDelta > 0.1) zoomLevel = 11;
    else if (maxDelta > 0.05) zoomLevel = 12;
    else if (maxDelta > 0.01) zoomLevel = 13;
    
    // Add visual highlight effect to show the user we're focusing
    // This creates a subtle flash effect on the polygon by adding a temporary highlight layer
    const polygonSource = map.getSource('polygon-source') as mapboxgl.GeoJSONSource;
    if (polygonSource) {
      // Flash the polygons briefly by adding a highlight class
      const mapCanvas = map.getCanvas();
      mapCanvas.classList.add('focusing-region');
      
      // Remove the highlight after a short duration
      setTimeout(() => {
        mapCanvas.classList.remove('focusing-region');
      }, 1500);
    }
    
    // Use easeTo for smooth animation from the current view to the target view
    map.easeTo({
      center: [centerLng, centerLat],
      zoom: zoomLevel,
      duration: 2000, // Longer duration for more noticeable animation (2 seconds)
      easing: (t) => {
        // Custom easing function to make the animation feel more natural
        // This is a cubic easing that starts slow, speeds up in the middle, and slows down at the end
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
    });
  }, []);
  
  // Effect to expose the focusOnRegion function to the parent component
  useEffect(() => {
    if (onFocusRegionRef) {
      onFocusRegionRef.current = focusOnRegion;
    }
    return () => {
      if (onFocusRegionRef) {
        onFocusRegionRef.current = null;
      }
    };
  }, [focusOnRegion, onFocusRegionRef]);

  // Effect to expose the enableDrawingMode function to the parent component
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

  // Add effect to handle polygon clearing request from parent - only clear drawings when both
  // currentPolygons and currentDrawing are empty to prevent unwanted clearing during searches
  useEffect(() => {
    // Only clear the mapbox draw if user has explicitly requested clearing
    // OR if we're in a completely fresh state with no polygons at all
    if ((currentPolygons.length === 0 && currentDrawing.length === 0) || userClearedPolygons) {
      clearAllDrawings();
    }
  }, [currentPolygons.length, currentDrawing.length, clearAllDrawings, userClearedPolygons]);

  const handleMouseEnter = useCallback((e: MapMouseEvent) => {
    if (!e.features?.length) return;
    
    const feature = e.features[0];
    if (!feature.properties || feature.properties.point_count) return;
    
    const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    if (!coordinates || !feature.properties.id) return;
    
    // Get the original listing data using the id
    const originalListing = listingsMap.get(feature.properties.id);
    
    // Update highlighted point filter
    debouncedSetHoveredId(feature.properties.id);
    
    // Update filter on the map
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
    
    // Reset filter on the map
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setFilter('highlighted-point', ['==', 'id', '']);
    }
  }, [debouncedSetHoveredPoint, debouncedSetHoveredId]);

  const handleClick = useCallback((e: MapMouseEvent) => {
    if (!e.features?.length || !onListingClick) return;
    
    const feature = e.features[0];
    if (!feature.properties || feature.properties.point_count) return;
    
    // Get the original listing data using the id
    const listingId = feature.properties.id;
    if (!listingId) return;
    
    const clickedListing = listingsMap.get(listingId);
    if (clickedListing) {
      onListingClick(clickedListing);
    }
  }, [listingsMap, onListingClick]);

  // Custom cluster click to zoom in on clusters
  const handleClusterClick = useCallback((e: MapMouseEvent) => {
    if (!e.features?.length) return;
    
      const feature = e.features[0];
    if (!feature.properties || !feature.properties.point_count) return;
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const clusterId = feature.properties.cluster_id;
      const mapboxSource = map.getSource('points') as mapboxgl.GeoJSONSource;
      
      mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        
        map.easeTo({
          center: (feature.geometry as GeoJSONPoint).coordinates as [number, number],
          zoom: zoom + 0.5
        });
      });
    }
  }, []);

  // Create memoized interactiveLayerIds
  const interactiveLayerIds = useMemo(() => ['unclustered-point', 'clusters'], []);

  // Create optimized cluster layer
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
        longitude: (listings && listings.length > 0) ? listings[0]?.longitude ?? MAP_CONFIG.defaultLongitude : MAP_CONFIG.defaultLongitude,
        latitude: (listings && listings.length > 0) ? listings[0]?.latitude ?? MAP_CONFIG.defaultLatitude : MAP_CONFIG.defaultLatitude,
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
      onClick={(e) => {
        if (e.features && e.features[0] && e.features[0].properties?.cluster) {
          handleClusterClick(e);
        } else {
          handleClick(e);
        }
      }}
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
          // sum of prices for aggregation data
          sum_price: ['+', ['get', 'price']],
          // count of assumable listings
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