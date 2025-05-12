import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Feature, Polygon } from 'geojson'

export async function POST(request: Request) {
  try {
    let polygon: Feature<Polygon>
    try {
      const body = await request.json()
      polygon = body as Feature<Polygon>
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      )
    }

    // Validate polygon data
    if (!polygon || !polygon.geometry || polygon.geometry.type !== 'Polygon') {
      return NextResponse.json(
        { error: 'Invalid polygon data. Expected GeoJSON Polygon feature.' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (!polygon.geometry.coordinates || !Array.isArray(polygon.geometry.coordinates[0])) {
      return NextResponse.json(
        { error: 'Invalid coordinates in polygon' },
        { status: 400 }
      )
    }

    // Convert the polygon to WKT (Well-Known Text) format for PostGIS
    try {
      const coordinates = polygon.geometry.coordinates[0]
      const wktPolygon = `POLYGON((${coordinates
        .map(([lng, lat]) => `${lng} ${lat}`)
        .join(', ')}))`
      console.log('Converted to WKT:', wktPolygon)

      // Use Prisma's raw query to perform the spatial search
      console.log('Executing spatial query...')
      const listings = await prisma.$queryRaw<any[]>`
        SELECT 
          l.id,
          l.address,
          l.city,
          l.state,
          l.price::float as price,
          l.bedrooms::float as bedrooms,
          l.bathrooms::float as bathrooms,
          l."squareFeet"::float as "squareFeet",
          l."propertyType" as "propertyType",
          l."photoUrls" as "photoUrls",
          l.status,
          l."createdAt" as "createdAt",
          l.latitude::float as latitude,
          l.longitude::float as longitude
        FROM "Listing" l
        WHERE ST_Contains(
          ST_SetSRID(ST_GeomFromText(${wktPolygon}), 4326),
          ST_SetSRID(ST_MakePoint(l.longitude::float, l.latitude::float), 4326)
        )
      `
      return NextResponse.json(listings)
    } catch (dbError) {
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in polygon search:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform polygon search', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
