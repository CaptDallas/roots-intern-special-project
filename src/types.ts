// Type definition for listing data returned from the API
import { Feature, Polygon } from 'geojson';

export interface SearchResult {
  id: string;
  timestamp: Date;
  polygons: Feature<Polygon>[];
  listings: Listing[];
  aggregations?: SearchAggregations;
}

export interface SearchAggregations {
  totalListings: number;
  assumableListings: number;
  medianLoanRate: number;
  avgPrice: number;
  avgAssumablePrice: number;
  propertyTypes: Record<string, number>;
}

export interface Listing {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string;
  photoUrls: string[];
  status: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  isAssumable: boolean;
  denormalizedAssumableInterestRate: number;
} 