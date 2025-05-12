'use client';  // Next 13+ App Router; omit for pages/

import 'mapbox-gl/dist/mapbox-gl.css';
import ReactMapGL, { Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection, Point as GeoJSONPoint } from 'geojson';
import type { LayerSpecification, SourceSpecification } from 'react-map-gl/mapbox';

type MapPoint = { latitude: number; longitude: number };

interface MapWithMarkersProps {
  markers: MapPoint[];
}

const clusterLayer: LayerSpecification = {
    id: 'clusters',
    type: 'circle',
    source: 'points',               // must match your source ID
    filter: ['has', 'point_count'], // only cluster features
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

// learning note: each feature is created from a marker point using .map()
export default function MapWithMarkers({ markers }: MapWithMarkersProps) {
    const data: FeatureCollection<GeoJSONPoint> = {
        type: 'FeatureCollection',
        features: markers.map((pt) => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [pt.longitude, pt.latitude]
          }
        }))
    };
    
    const sources: Record<string, SourceSpecification> = {
    points: {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 14,  // max zoom level to cluster points on
      clusterRadius: 50    // cluster radius in pixels
    }
    };

    const layers: LayerSpecification[] = [
        clusterLayer,
        //clusterCountLayer,
        unclusteredPointLayer
      ];
      
    return (
        <ReactMapGL
          initialViewState={{ //init to first marker
          longitude: markers[0]?.longitude ?? -122.4,
          latitude: markers[0]?.latitude ?? 37.8,
          zoom: 12
          }}
          style={{ width: '100%', height: '400px' }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
          attributionControl={false}
        >
          <Source {...sources.points}>
            {layers.map((layer) => (
               <Layer key={layer.id} {...layer} />
              ))}
          </Source>
            
        </ReactMapGL>
    );
    }
