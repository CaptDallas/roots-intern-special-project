// Type definition for listing data returned from the API
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
} 