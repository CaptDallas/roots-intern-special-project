/**
 * theme.ts
 * 
 * A centralized place for all design tokens in the application.
 * This includes colors, spacing, shadows, and other design constants.
 */

// Brand Colors
export const COLORS = {
  brand: {
    green: '#CDFF64',
    greenDark: '#7b9334',
    greenMedium: '#b3df4a',
    greenLight: '#e4ffab',
    purple: '#BE5EE0',  // complementary color
    gold: '#E0CD5E',    // split complementary color
  },
  ui: {
    background: '#FFFFFF',
    text: '#333333',
    border: '#EEEEEE',
  },
  region: {
    // Green (using our brand green)
    alpha: {
      main: '#CDFF64',
      dark: '#7b9334',
      medium: '#b3df4a',
      light: '#e4ffab',
    },
    // Blue
    beta: {
      main: '#64A1FF',
      dark: '#3471B3',
      medium: '#89B8FF',
      light: '#D6E5FF',
    },
    // Purple
    gamma: {
      main: '#BE5EE0',
      dark: '#8C44A6',
      medium: '#D27EED',
      light: '#F0D5F9',
    },
    // Orange
    delta: {
      main: '#FF9F45',
      dark: '#D97B1F',
      medium: '#FFB673',
      light: '#FFE0C2',
    },
    // Red
    epsilon: {
      main: '#FF6B6B',
      dark: '#C84848',
      medium: '#FF9393',
      light: '#FFCECE',
    },
    // Teal
    zeta: {
      main: '#4ECDC4',
      dark: '#339E96',
      medium: '#7ADBD4',
      light: '#C1F0EC',
    },
    // Yellow
    eta: {
      main: '#FFD166',
      dark: '#D4A83C',
      medium: '#FFDF8C',
      light: '#FFF2D1',
    },
    // Pink
    theta: {
      main: '#FF6B9D',
      dark: '#C84A7A',
      medium: '#FF96B9',
      light: '#FFD1E0',
    }
  }
};

// Shadows
export const SHADOWS = {
  sm: '0px 2px 4px rgba(0,0,0,0.1)',
  md: '0px 4px 10px rgba(0,0,0,0.2)',
  lg: '0px 6px 12px rgba(0,0,0,0.25)',
};

// Commonly used values can be extracted here
export const BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '16px',
};

// Map specific configuration
export const MAP_CONFIG = {
  mapStyle: "mapbox://styles/mapbox/light-v11",
  initialZoom: 12,
  defaultLatitude: 33.562417,
  defaultLongitude: -112.424063
}; 