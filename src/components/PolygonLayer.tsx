import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { Feature, Polygon, FeatureCollection } from 'geojson';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/mapbox';

interface PolygonLayerProps {
  polygons: Feature<Polygon>[];
  onPolygonClick?: (polygon: Feature<Polygon>) => void;
}

export default function PolygonLayer({ polygons, onPolygonClick }: PolygonLayerProps) {
  // Convert the polygons array to a GeoJSON feature collection
  const polygonData = useMemo((): FeatureCollection<Polygon> => {
    return {
      type: 'FeatureCollection',
      features: polygons
    };
  }, [polygons]);

  // Define the polygon fill layer
  const polygonFillLayer: FillLayerSpecification = {
    id: 'polygon-fill',
    type: 'fill',
    source: 'polygon-source',
    paint: {
      'fill-color': '#CDFF64',
      'fill-opacity': 0.2
    }
  };

  // Define the polygon outline layer
  const polygonOutlineLayer: LineLayerSpecification = {
    id: 'polygon-outline',
    type: 'line',
    source: 'polygon-source',
    paint: {
      'line-color': '#7b9334',
      'line-width': 2
    }
  };

  // Handle polygon click
  const handleClick = (e: any) => {
    if (onPolygonClick && e.features && e.features.length > 0) {
      onPolygonClick(e.features[0]);
    }
  };

  // If there are no polygons, don't render anything
  if (polygons.length === 0) return null;

  return (
    <Source id="polygon-source" type="geojson" data={polygonData}>
      <Layer {...polygonFillLayer} />
      <Layer {...polygonOutlineLayer} />
    </Source>
  );
} 