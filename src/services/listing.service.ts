import { prisma } from '@/lib/prisma'
import { Listing } from '@/types/listing'

// Type for creating a new listing with additional required fields
export type CreateListingInput = Omit<Listing, 'createdAt'> & {
  // Additional required fields not included in the basic Listing type
  mlsProviderId: string
  parcelNumber: string
  zipCode: string
  rawDataHash: string
  mlsListingId: string
  mlsInstanceId: string
  unitNumber: string
  modifierScore: number
  isRootsListing: boolean
}

// Type for updating an existing listing
export type UpdateListingInput = Partial<Omit<Listing, 'id' | 'createdAt'>> & {
  id: string // ID is always required for updates
}

// Basic fields to select for listing results
export const defaultListingSelect = {
  id: true,
  address: true,
  city: true,
  state: true,
  price: true,
  bedrooms: true,
  bathrooms: true,
  squareFeet: true,
  propertyType: true,
  photoUrls: true,
  status: true,
  createdAt: true,
  latitude: true,
  longitude: true,
  isAssumable: true
}

// Define an interface for RawListingData based on the Prisma model
interface RawListingData {
  id: string;
  mlsProviderId: string;
  rawData: any; // JSON data from MLS
  rawDataHash: string;
  status: string;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date | null;
  parcelNumber?: string | null;
  zipCode?: string | null;
  mlsStatus?: string | null;
  modificationTimestamp?: Date | null;
  mlsInstanceId?: string | null;
  propertyType?: string | null;
  statusChangeTimestamp?: Date | null;
  unitNumber: string;
  unparsedAddress?: string | null;
  // Additional fields can be added as needed
}

export class ListingService {
  // Process a raw listing into a validated Listing entity
  async processRawListing(rawListing: RawListingData): Promise<CreateListingInput> {
    // Extract the raw data from the JSON field
    const rawData = rawListing.rawData;
    
    // Helper function to safely get a property with type coercion
    const getProperty = <T>(obj: any, path: string, defaultValue: T, transform?: (val: any) => T): T => {
      try {
        const parts = path.split('.');
        let value = obj;
        
        for (const part of parts) {
          if (value === null || value === undefined) return defaultValue;
          value = value[part];
        }
        
        if (value === null || value === undefined) return defaultValue;
        
        if (transform) {
          try {
            return transform(value);
          } catch (e) {
            return defaultValue;
          }
        }
        
        return value as T;
      } catch (e) {
        return defaultValue;
      }
    };
    
    // Get string with trimming
    const getString = (obj: any, path: string, defaultValue: string = ''): string => {
      return getProperty(obj, path, defaultValue, (val) => 
        val === null || val === undefined ? defaultValue : String(val).trim()
      );
    };
    
    // Get number with proper conversion
    const getNumber = (obj: any, path: string, defaultValue: number | null = null): number | null => {
      return getProperty(obj, path, defaultValue, (val) => {
        if (val === null || val === undefined) return defaultValue;
        const num = Number(val);
        return isNaN(num) ? defaultValue : num;
      });
    };
    
    // Get boolean with proper conversion
    const getBoolean = (obj: any, path: string, defaultValue: boolean = false): boolean => {
      return getProperty(obj, path, defaultValue, (val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          return normalized === 'true' || normalized === 'yes' || normalized === '1';
        }
        if (typeof val === 'number') return val !== 0;
        return defaultValue;
      });
    };
    
    // Parse MLS status into our internal ListingStatus enum
    const parseStatus = (status: string): string => {
      const normalized = status.toUpperCase().trim();
      
      // Map MLS status strings to our ListingStatus enum
      const statusMap: Record<string, string> = {
        'ACTIVE': 'ACTIVE',
        'PENDING': 'PENDING',
        'SOLD': 'SOLD',
        'WITHDRAWN': 'WITHDRAWN',
        'EXPIRED': 'EXPIRED',
        // Add more mappings as needed
      };
      
      return statusMap[normalized] || 'ACTIVE'; // Default to ACTIVE if unknown
    };
    
    // Extract and process address components
    const street = getString(rawData, 'address.street');
    const city = getString(rawData, 'address.city');
    const state = getString(rawData, 'address.state');
    const formattedAddress = street ? street : getString(rawData, 'unparsedAddress');
    
    // Parse Property Type
    const propertyType = getString(rawData, 'propertyType', 'UNKNOWN');
    
    // Create the listing object with proper transformation
    const listing: CreateListingInput = {
      id: rawListing.id,
      mlsProviderId: rawListing.mlsProviderId,
      parcelNumber: getString(rawData, 'parcelNumber') || rawListing.parcelNumber || '',
      zipCode: getString(rawData, 'zipCode') || rawListing.zipCode || '',
      rawDataHash: rawListing.rawDataHash,
      mlsListingId: getString(rawData, 'mlsListingId', ''),
      mlsInstanceId: rawListing.mlsInstanceId || '',
      isAssumable: getBoolean(rawData, 'isAssumable', false),
      status: parseStatus(getString(rawData, 'status', 'ACTIVE')),
      price: getNumber(rawData, 'price', 0) || 0,
      propertyType: propertyType as any, // Type casting to satisfy TypeScript
      bedrooms: getNumber(rawData, 'bedrooms'),
      bathrooms: getNumber(rawData, 'bathrooms'),
      squareFeet: getNumber(rawData, 'squareFeet'),
      address: formattedAddress,
      city: city,
      state: state,
      latitude: getNumber(rawData, 'latitude', 0) || 0,
      longitude: getNumber(rawData, 'longitude', 0) || 0,
      unitNumber: rawListing.unitNumber || '',
      photoUrls: Array.isArray(rawData.photoUrls) ? rawData.photoUrls : [],
      denormalizedAssumableInterestRate: getNumber(rawData, 'assumableInterestRate', 0) || 0,
      modifierScore: rawListing.mlsInstanceId ? 1 : 0,
      isRootsListing: false
    };
    
    return listing;
  }
  
  // Process and save a batch of raw listings
  async processBatch(rawListings: RawListingData[]): Promise<{
    processed: number;
    failed: number;
    timeElapsed: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    
    for (const rawListing of rawListings) {
      try {
        // Skip already processed listings
        if (rawListing.processedAt) {
          continue;
        }
        
        // Process the raw listing into a format ready for saving
        const listingData = await this.processRawListing(rawListing);
        
        // Check if a listing with this ID already exists
        const existingListing = await prisma.listing.findUnique({
          where: { id: listingData.id }
        });
        
        if (existingListing) {
          // Update existing
          await prisma.listing.update({
            where: { id: listingData.id },
            data: listingData
          });
        } else {
          // Create new
          await prisma.listing.create({
            data: listingData
          });
        }
        
        // Mark as processed
        await prisma.rawListingData.update({
          where: { id: rawListing.id },
          data: {
            processedAt: new Date(),
            status: 'COMPLETED'
          }
        });
        
        processed++;
      } catch (error) {
        // Mark as failed
        await prisma.rawListingData.update({
          where: { id: rawListing.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
        
        failed++;
      }
    }
    
    const timeElapsed = Date.now() - startTime;
    
    return {
      processed,
      failed,
      timeElapsed
    };
  }

  // needs updating
  async create(data: CreateListingInput) {
    return prisma.listing.create({
      data: data as any,
      select: defaultListingSelect
    })
  }

  async findAll() {
    return prisma.listing.findMany({
      select: defaultListingSelect
    })
  }

  async findById(id: string) {
    return prisma.listing.findUnique({
      where: { id },
      select: defaultListingSelect
    })
  }

  async update(id: string, data: any) {
    return prisma.listing.update({
      where: { id },
      data: data as any,
      select: defaultListingSelect
    })
  }

  async delete(id: string) {
    return prisma.listing.delete({
      where: { id },
      select: defaultListingSelect
    })
  }

  async search(query: string) {
    return prisma.listing.findMany({
      where: {
        OR: [
          { address: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { state: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: defaultListingSelect
    })
  }
} 