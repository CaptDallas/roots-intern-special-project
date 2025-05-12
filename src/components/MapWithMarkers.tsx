'use client';  // Next 13+ App Router; omit for pages/

import React, { useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import ReactMapGL, { Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection, Point as GeoJSONPoint, Feature } from 'geojson';
import type { LayerSpecification, SourceSpecification } from 'react-map-gl/mapbox';

type MapPoint = { latitude: number; longitude: number };

interface MapWithMarkersProps {
  markers: MapPoint[];
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

function useMapData(markers: MapPoint[]) {
  const data: FeatureCollection<GeoJSONPoint> = {
    type: 'FeatureCollection',
    features: markers.map((pt: MapPoint) => ({
      type: 'Feature',
      properties: {},
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
    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 25, '#f28cb1']
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
    'circle-color': '#11b4da'
  }
};

export default function MapWithMarkers({ markers, onPolygonChange }: MapWithMarkersProps) {
  const mapRef = useRef<MapRef>(null);
  const { onMapLoad } = usePolygonDrawing(mapRef, onPolygonChange);
  const { data } = useMapData(markers);

  return (
    <ReactMapGL
      ref={mapRef}
      initialViewState={{
        longitude: markers[0]?.longitude ?? -122.4,
        latitude: markers[0]?.latitude ?? 37.8,
        zoom: 12
      }}
      style={{ width: '100%', height: '800px' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
      attributionControl={false}
      onLoad={onMapLoad}
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
    </ReactMapGL>
  );
}
