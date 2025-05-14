import type { LayerSpecification } from 'react-map-gl/mapbox';

const BRAND_GREEN = '#CDFF64';
const BRAND_GREEN_DARK = '#7b9334';
const BRAND_GREEN_MEDIUM = '#b3df4a';
const BRAND_GREEN_LIGHT = '#e4ffab';
const BRAND_PURPLE = '#BE5EE0'; // complementary color
const BRAND_GOLD = '#E0CD5E'; // split complementary color

export const MAP_LAYERS = {
  clusterLayer: {
    id: 'clusters',
    type: 'circle',
    source: 'points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 25, 25],
      'circle-color': ['step', ['get', 'point_count'], BRAND_GREEN, 10, BRAND_GREEN_MEDIUM, 25, BRAND_GREEN_DARK],
      'circle-stroke-width': 2,
      'circle-stroke-color': BRAND_GREEN_DARK
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
      'circle-color': BRAND_GREEN,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': BRAND_GREEN_DARK
    }
  } as LayerSpecification,

  highlightedPointLayer: {
    id: 'highlighted-point',
    type: 'circle',
    source: 'points',
    filter: ['==', 'id', ''],
    paint: {
      'circle-radius': 10,
      'circle-color': BRAND_GREEN,
      'circle-stroke-width': 2,
      'circle-stroke-color': BRAND_GREEN_DARK
    }
  } as LayerSpecification
};

export const DRAW_STYLES = [
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': BRAND_GREEN,
      'line-width': 2
    }
  },
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': BRAND_GREEN,
      'fill-outline-color': BRAND_GREEN,
      'fill-opacity': 0.1
    }
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': BRAND_GREEN,
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
      'circle-stroke-color': BRAND_GREEN,
      'circle-stroke-width': 2
    }
  }
];

export const MAP_CONFIG = {
  mapStyle: "mapbox://styles/mapbox/light-v11",
  initialZoom: 12,
  defaultLatitude: 33.562417,
  defaultLongitude: -112.424063
}; 