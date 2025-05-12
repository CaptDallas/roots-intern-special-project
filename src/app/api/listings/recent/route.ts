import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
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
        longitude: true
      }
    })

    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error fetching recent listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent listings' },
      { status: 500 }
    )
  }
} 