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


export class ListingService {
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