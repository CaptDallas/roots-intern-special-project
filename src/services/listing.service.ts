import { prisma } from '@/lib/prisma'

// Type for creating a new listing with required fields
export interface CreateListingInput {
  // Required fields
  id: string
  address: string
  price: number
  propertyType: string
  latitude: number
  longitude: number
  mlsProviderId: string
  parcelNumber: string
  zipCode: string
  rawDataHash: string
  mlsListingId: string
  status: string
  mlsInstanceId: string
  unitNumber: string
  modifierScore: number
  isRootsListing: boolean
  
  // Optional fields
  city?: string
  state?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  photoUrls?: string[]
  isAssumable?: boolean
  // Add other fields as needed
}

// Type for updating an existing listing
export interface UpdateListingInput {
  id: string
  // All fields are optional for updates
  address?: string
  city?: string
  state?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  propertyType?: string
  photoUrls?: string[]
  latitude?: number
  longitude?: number
  isAssumable?: boolean
  // Add other fields as needed
}

// Basic fields to select for listing results
const defaultListingSelect = {
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

export class ListingService {
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