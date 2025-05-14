import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { Feature, Polygon, FeatureCollection } from 'geojson';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/mapbox';

// Define polygon styling options
type PolygonStyle = {
  fillColor: string;
  fillOpacity: number;
  outlineColor: string;
  outlineWidth: number;
};

const DEFAULT_STYLE: PolygonStyle = {
  fillColor: '#CDFF64',
  fillOpacity: 0.2,
  outlineColor: '#7b9334',
  outlineWidth: 2
};

const HISTORICAL_STYLE: PolygonStyle = {
  fillColor: '#64A1FF',
  fillOpacity: 0.15,
  outlineColor: '#3471B3',
  outlineWidth: 1.5
};

interface PolygonLayerProps {
  polygons: Feature<Polygon>[];
  historicalPolygons?: Feature<Polygon>[];
  onPolygonClick?: (polygon: Feature<Polygon>, isHistorical: boolean) => void;
  label?: string;
}

export default function PolygonLayer({ 
  polygons, 
  historicalPolygons = [], 
  onPolygonClick,
  label
}: PolygonLayerProps) {
  // Add a property to identify polygon type (active vs historical)
  const processedPolygons = useMemo(() => {
    return polygons.map(polygon => ({
      ...polygon,
      properties: {
        ...polygon.properties,
        polygonType: 'active'
      }
    }));
  }, [polygons]);

  const processedHistoricalPolygons = useMemo(() => {
    return historicalPolygons.map(polygon => ({
      ...polygon,
      properties: {
        ...polygon.properties,
        polygonType: 'historical'
      }
    }));
  }, [historicalPolygons]);

  // Combine both active and historical polygons
  const allPolygons = useMemo(() => {
    return [...processedPolygons, ...processedHistoricalPolygons];
  }, [processedPolygons, processedHistoricalPolygons]);

  // Convert the polygons array to a GeoJSON feature collection
  const polygonData = useMemo((): FeatureCollection<Polygon> => {
    return {
      type: 'FeatureCollection',
      features: allPolygons
    };
  }, [allPolygons]);

  // Define the polygon fill layer with conditional styling
  const polygonFillLayer: FillLayerSpecification = {
    id: 'polygon-fill',
    type: 'fill',
    source: 'polygon-source',
    paint: {
      'fill-color': [
        'match',
        ['get', 'polygonType'],
        'historical', HISTORICAL_STYLE.fillColor,
        DEFAULT_STYLE.fillColor
      ],
      'fill-opacity': [
        'match',
        ['get', 'polygonType'],
        'historical', HISTORICAL_STYLE.fillOpacity,
        DEFAULT_STYLE.fillOpacity
      ]
    }
  };

  // Define the polygon outline layer with conditional styling
  const polygonOutlineLayer: LineLayerSpecification = {
    id: 'polygon-outline',
    type: 'line',
    source: 'polygon-source',
    paint: {
      'line-color': [
        'match',
        ['get', 'polygonType'],
        'historical', HISTORICAL_STYLE.outlineColor,
        DEFAULT_STYLE.outlineColor
      ],
      'line-width': [
        'match',
        ['get', 'polygonType'],
        'historical', HISTORICAL_STYLE.outlineWidth,
        DEFAULT_STYLE.outlineWidth
      ]
    }
  };

  // Handle polygon click
  const handleClick = (e: any) => {
    if (onPolygonClick && e.features && e.features.length > 0) {
      const feature = e.features[0];
      const isHistorical = feature.properties?.polygonType === 'historical';
      onPolygonClick(feature, isHistorical);
    }
  };

  // If there are no polygons, don't render anything
  if (allPolygons.length === 0) return null;

  return (
    <Source id="polygon-source" type="geojson" data={polygonData}>
      <Layer {...polygonFillLayer} />
      <Layer {...polygonOutlineLayer} />
    </Source>
  );
} 