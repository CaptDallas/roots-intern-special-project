import { Feature, Polygon } from 'geojson';
import { Listing, SearchAggregations, SearchResult } from '@/types';

interface PolygonSearchFilters {
  assumable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export async function searchByPolygons(
  polygons: Feature<Polygon>[],
  filters: PolygonSearchFilters = {}
): Promise<{
  listings: Listing[];
  aggregations: SearchAggregations;
  totalCount: number;
}> {
  if (!polygons.length) {
    throw new Error('At least one polygon is required');
  }
  
  const queryParams = new URLSearchParams();
  
  if (filters.assumable) {
    queryParams.append('assumable', 'true');
  }
  if (filters.minPrice) {
    queryParams.append('minPrice', filters.minPrice.toString());
  }
  if (filters.maxPrice) {
    queryParams.append('maxPrice', filters.maxPrice.toString());
  }
  if (filters.limit) {
    queryParams.append('limit', filters.limit.toString());
  }
  
  const url = `/api/listings/polygon${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(polygons)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch polygon listings');
  }
  
  return await response.json();
}