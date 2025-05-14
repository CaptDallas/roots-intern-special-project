import type { LayerSpecification } from 'react-map-gl/mapbox';
import { COLORS, MAP_CONFIG } from './theme';

export const MAP_LAYERS = {
  clusterLayer: {
    id: 'clusters',
    type: 'circle',
    source: 'points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 25, 25],
      'circle-color': ['step', ['get', 'point_count'], COLORS.brand.green, 10, COLORS.brand.greenMedium, 25, COLORS.brand.greenDark],
      'circle-stroke-width': 2,
      'circle-stroke-color': COLORS.brand.greenDark
    }
  } as LayerSpecification,

  clusterCountLayer: {
    id: 'cluster-count',
    type: 'symbol',
    source: 'points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 14,
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold']
    },
    paint: {
      'text-color': '#000000'
    }
  } as LayerSpecification,

  unclusteredPointLayer: {
    id: 'unclustered-point',
    type: 'circle',
    source: 'points',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 8,
      'circle-color': COLORS.brand.green,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': COLORS.brand.greenDark
    }
  } as LayerSpecification,

  highlightedPointLayer: {
    id: 'highlighted-point',
    type: 'circle',
    source: 'points',
    filter: ['==', 'id', ''],
    paint: {
      'circle-radius': 10,
      'circle-color': COLORS.brand.green,
      'circle-stroke-width': 2,
      'circle-stroke-color': COLORS.brand.greenDark
    }
  } as LayerSpecification
};

export const DRAW_STYLES = [
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': COLORS.brand.green,
      'line-width': 2
    }
  },
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': COLORS.brand.green,
      'fill-outline-color': COLORS.brand.green,
      'fill-opacity': 0.1
    }
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': COLORS.brand.green,
      'line-width': 2
    }
  },
  {
    id: 'gl-draw-point-point-stroke-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': COLORS.brand.green,
      'circle-stroke-width': 2
    }
  }
];

// Re-export MAP_CONFIG from theme to maintain backwards compatibility
export { MAP_CONFIG } from './theme'; 