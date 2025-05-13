'use client';  // Next 13+ App Router; omit for pages/

import React, { useRef, useState, useEffect, useMemo } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import ReactMapGL, { Source, Layer, MapRef, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection, Point as GeoJSONPoint, Feature } from 'geojson';
import type { LayerSpecification, SourceSpecification } from 'react-map-gl/mapbox';
import { Box, Text, VStack, Image, Skeleton } from '@chakra-ui/react';
import type { MapMouseEvent } from 'mapbox-gl';
import { Listing } from '@/types/listing';

interface InteractiveMapProps {
  listings: Listing[];
  onPolygonChange?: (polygon: Feature | null) => void;
}

type HoveredPoint = {
  longitude: number;
  latitude: number;
  properties: any;
  originalListing?: Listing;
} | null;

// Mapbox layer definitions
const MAP_LAYERS = {
  clusterLayer: {
    id: 'clusters',
    type: 'circle',
    source: 'points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 25, 25],
      'circle-color': ['step', ['get', 'point_count'], 'grey', 10, 'grey', 25, 'grey']
    }
  } as LayerSpecification,

  clusterCountLayer: {
    id: 'cluster-count',
    type: 'symbol',
    source: 'points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12
    }
  } as LayerSpecification,

  unclusteredPointLayer: {
    id: 'unclustered-point',
    type: 'circle',
    source: 'points',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 6,
      'circle-color': 'grey'
    }
  } as LayerSpecification
};


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


function useListingsData(listings: Listing[]) {
  // Convert listings to GeoJSON format
  const geoJsonData = useMemo<FeatureCollection<GeoJSONPoint>>(() => ({
    type: 'FeatureCollection',
    features: listings.map((listing: Listing) => ({
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
        photoUrls: listing.photoUrls,
        isAssumable: listing.isAssumable
      },
      geometry: { 
        type: 'Point', 
        coordinates: [listing.longitude, listing.latitude] 
      }
    }))
  }), [listings]);

  // Create a lookup map for fast access to original listing data
  const listingsMap = useMemo(() => {
    const map = new Map<string, Listing>();
    listings.forEach(listing => {
      if (listing.id) {
        map.set(listing.id, listing);
      }
    });
    return map;
  }, [listings]);

  return { geoJsonData, listingsMap };
}

// ListingPopup component
function ListingPopup({ 
  point, 
  onClose 
}: { 
  point: HoveredPoint, 
  onClose: () => void 
}) {
  const [imageError, setImageError] = useState(false);
  const listing = point?.originalListing;

  if (!point) return null;

  return (
    <Popup
      longitude={point.longitude}
      latitude={point.latitude}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={[0, -10]}
      onClose={onClose}
    >
      <Box p={2} maxW="300px">
        {/* Image Section */}
        {renderListingImage(listing, imageError, setImageError)}
        
        {/* Details Section */}
        <VStack align="start" gap={1}>
          <Text fontWeight="bold" fontSize="lg">
            ${listing?.price?.toLocaleString() || point.properties.price?.toLocaleString()}
          </Text>
          {(listing?.address || point.properties.address) && (
            <Text>{listing?.address || point.properties.address}</Text>
          )}
          <Text>
            {listing?.bedrooms && `${listing.bedrooms} beds`}
            {listing?.bathrooms && ` • ${listing.bathrooms} baths`}
            {listing?.squareFeet && ` • ${listing.squareFeet} sqft`}
          </Text>
          {(listing?.propertyType || point.properties.propertyType) && (
            <Text color="gray.500" fontSize="sm">
              {listing?.propertyType || point.properties.propertyType}
            </Text>
          )}
          {(listing?.status || point.properties.status) && (
            <Text color="blue.500" fontSize="sm">
              {listing?.status || point.properties.status}
            </Text>
          )}
          {(listing?.isAssumable || point.properties.isAssumable) && (
            <Text color="green.500" fontSize="sm" fontWeight="bold">
              Assumable
            </Text>
          )}
        </VStack>
      </Box>
    </Popup>
  );
}

// Helper function for rendering listing image
function renderListingImage(
  listing?: Listing, 
  imageError: boolean = false, 
  setImageError?: (error: boolean) => void
) {
  if (listing?.photoUrls && Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0) {
    if (!imageError) {
      return (
        <Image
          src={listing.photoUrls[0]}
          alt={listing.address || 'Property'}
          height="150px"
          width="100%"
          objectFit="cover"
          borderRadius="md"
          mb={2}
          onError={() => setImageError?.(true)}
        />
      );
    } else {
      return renderImageFallback("Image Failed to Load");
    }
  } else {
    return renderImageFallback("No Image Available");
  }
}

// Helper function for rendering image fallbacks
function renderImageFallback(message: string) {
  return (
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
      <Text color="gray.500">{message}</Text>
    </Box>
  );
}


export default function InteractiveMap({ listings, onPolygonChange }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { onMapLoad } = usePolygonDrawing(mapRef, onPolygonChange);
  const { geoJsonData, listingsMap } = useListingsData(listings);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint>(null);

  const handleMouseEnter = (e: MapMouseEvent) => {
    if (!e.features?.length) return;
    
    const feature = e.features[0];
    if (!feature.properties || feature.properties.point_count) return;
    
    const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    if (!coordinates || !feature.properties.id) return;
    
    // Get the original listing data using the id
    const originalListing = listingsMap.get(feature.properties.id);
    
    setHoveredPoint({
      longitude: coordinates[0],
      latitude: coordinates[1],
      properties: { ...feature.properties },
      originalListing
    });
  };

  const handleMouseLeave = () => {
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
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
      attributionControl={false}
      onLoad={onMapLoad}
      interactiveLayerIds={['unclustered-point']}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Map Data Source */}
      <Source
        id="points"
        type="geojson"
        data={geoJsonData}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...MAP_LAYERS.clusterLayer} />
        <Layer {...MAP_LAYERS.clusterCountLayer} />
        <Layer {...MAP_LAYERS.unclusteredPointLayer} />
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