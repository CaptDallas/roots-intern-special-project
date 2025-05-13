'use client';  // Next 13+ App Router; omit for pages/

import React, { useRef, useState, useEffect } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import ReactMapGL, { Source, Layer, MapRef, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection, Point as GeoJSONPoint, Feature } from 'geojson';
import type { LayerSpecification, SourceSpecification } from 'react-map-gl/mapbox';
import { Box, Text, VStack, Image, Skeleton } from '@chakra-ui/react';
import type { MapMouseEvent } from 'mapbox-gl';

type Listing = { 
  latitude: number; 
  longitude: number;
  id?: string;
  address?: string;
  price?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  propertyType?: string;
  status?: string;
  photoUrls?: string[];
};

interface InteractiveMapProps {
  listings: Listing[];
  onPolygonChange?: (polygon: Feature | null) => void;
}

function usePolygonDrawing(
  mapRef: React.RefObject<MapRef | null>,
  onPolygonChange?: (polygon: Feature | null) => void
) {
  const drawRef = useRef<MapboxDraw | null>(null);

  const updatePolygon = () => {
    if (!drawRef.current) return;
    const allData = drawRef.current.getAll();
    const polygon = allData.features[0] ?? null;
    onPolygonChange?.(polygon);
  };

  const onMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true }
    });
    map.addControl(drawRef.current, 'top-left');

    map.on('draw.create', updatePolygon);
    map.on('draw.update', updatePolygon);
    map.on('draw.delete', () => onPolygonChange?.(null));
  };

  return { onMapLoad };
}

function useMapData(listings: Listing[]) {
  const data: FeatureCollection<GeoJSONPoint> = {
    type: 'FeatureCollection',
    features: listings.map((pt: Listing) => ({
      type: 'Feature',
      properties: {
        id: pt.id,
        address: pt.address,
        price: pt.price,
        bedrooms: pt.bedrooms,
        bathrooms: pt.bathrooms,
        squareFeet: pt.squareFeet,
        propertyType: pt.propertyType,
        status: pt.status,
        photoUrls: pt.photoUrls
      },
      geometry: { type: 'Point', coordinates: [pt.longitude, pt.latitude] }
    }))
  };

  return { data };
}

// Layer definitions
const clusterLayer: LayerSpecification = {
  id: 'clusters',
  type: 'circle',
  source: 'points',
  filter: ['has', 'point_count'],
  paint: {
    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 25, 25],
    'circle-color': ['step', ['get', 'point_count'], 'grey', 10, 'grey', 25, 'grey']
  }
};

const clusterCountLayer: LayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'points',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 12
  }
};

const unclusteredPointLayer: LayerSpecification = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'points',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': 6,
    'circle-color': 'grey'
  }
};

export default function InteractiveMap({ listings, onPolygonChange }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { onMapLoad } = usePolygonDrawing(mapRef, onPolygonChange);
  const { data } = useMapData(listings);
  const [hoveredPoint, setHoveredPoint] = useState<{
    longitude: number;
    latitude: number;
    properties: any;
    originalMarker?: Listing;
  } | null>(null);
  const [imageError, setImageError] = useState(false);
  
  // A dictionary of id's to Listing objects
  const markersRef = useRef<Map<string, Listing>>(new Map());
  
  useEffect(() => {
    const markersMap = new Map<string, Listing>();
    listings.forEach(listing => {
      if (listing.id) {
        markersMap.set(listing.id, listing);
      }
    });
    markersRef.current = markersMap;
  }, [listings]);

  const onMouseEnter = (e: MapMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      
      if (feature.properties && !feature.properties.point_count) {
        const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
        
        if (coordinates && feature.properties.id) {
          // Get the original marker data using the id
          const originalMarker = markersRef.current.get(feature.properties.id);
          
          const properties = { ...feature.properties };
          
          setHoveredPoint({
            longitude: coordinates[0],
            latitude: coordinates[1],
            properties: properties,
            originalMarker: originalMarker
          });
          setImageError(false);
        }
      }
    }
  };

  const onMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <ReactMapGL
      ref={mapRef}
      initialViewState={{
        longitude: listings[0]?.longitude ?? -112.424063,
        latitude: listings[0]?.latitude ?? 33.562417,
        zoom: 12
      }}
      style={{ width: '100%', height: '800px' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
      attributionControl={false}
      onLoad={onMapLoad}
      interactiveLayerIds={['unclustered-point']}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Source
        id="points"
        type="geojson"
        data={data}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredPointLayer} />
      </Source>

      {hoveredPoint && (
        <Popup
          longitude={hoveredPoint.longitude}
          latitude={hoveredPoint.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -10]}
        > 
          <Box p={2} maxW="300px">
            {hoveredPoint.originalMarker?.photoUrls && 
             Array.isArray(hoveredPoint.originalMarker.photoUrls) && 
             hoveredPoint.originalMarker.photoUrls.length > 0 ? (
              !imageError ? (
                (() => {
                  return (
                    <Image
                      src={hoveredPoint.originalMarker.photoUrls[0]}
                      alt={hoveredPoint.originalMarker.address || ''}
                      height="150px"
                      width="100%"
                      objectFit="cover"
                      borderRadius="md"
                      mb={2}
                      onLoad={() => console.log('POPUP IMAGE: Image loaded successfully')}
                      onError={() => {
                        console.error('POPUP IMAGE: Image failed to load:', hoveredPoint.originalMarker?.photoUrls?.[0]);
                        setImageError(true);
                      }}
                    />
                  );
                })()
              ) : (
                <Box 
                  height="150px" 
                  width="100%" 
                  bg="gray.200" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  borderRadius="md" 
                  mb={2}
                >
                  <Text color="gray.500">Image Failed to Load</Text>
                </Box>
              )
            ) : (
              <Box 
                height="150px" 
                width="100%" 
                bg="gray.200" 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                borderRadius="md" 
                mb={2}
              >
                <Text color="gray.500">No Image Available</Text>
              </Box>
            )}
            
            <VStack align="start" gap={1}>
              <Text fontWeight="bold" fontSize="lg">
                ${hoveredPoint.originalMarker?.price?.toLocaleString() || hoveredPoint.properties.price?.toLocaleString()}
              </Text>
              {(hoveredPoint.originalMarker?.address || hoveredPoint.properties.address) && (
                <Text>{hoveredPoint.originalMarker?.address || hoveredPoint.properties.address}</Text>
              )}
              <Text>
                {hoveredPoint.originalMarker?.bedrooms && `${hoveredPoint.originalMarker.bedrooms} beds`}
                {hoveredPoint.originalMarker?.bathrooms && ` • ${hoveredPoint.originalMarker.bathrooms} baths`}
                {hoveredPoint.originalMarker?.squareFeet && ` • ${hoveredPoint.originalMarker.squareFeet} sqft`}
              </Text>
              {(hoveredPoint.originalMarker?.propertyType || hoveredPoint.properties.propertyType) && (
                <Text color="gray.500" fontSize="sm">
                  {hoveredPoint.originalMarker?.propertyType || hoveredPoint.properties.propertyType}
                </Text>
              )}
              {(hoveredPoint.originalMarker?.status || hoveredPoint.properties.status) && (
                <Text color="blue.500" fontSize="sm">
                  {hoveredPoint.originalMarker?.status || hoveredPoint.properties.status}
                </Text>
              )}
            </VStack>
          </Box>
        </Popup>
      )}
    </ReactMapGL>
  );
}