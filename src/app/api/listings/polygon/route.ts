import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Feature, Polygon } from 'geojson'

export async function POST(request: Request) {
  try {
    let polygons: Feature<Polygon>[]
    try {
      const body = await request.json()
      polygons = Array.isArray(body) ? body as Feature<Polygon>[] : [body as Feature<Polygon>]
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      )
    }

    if (!polygons.length) {
      return NextResponse.json(
        { error: 'No polygons provided. Expected array of GeoJSON Polygon features.' },
        { status: 400 }
      )
    }

    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i]
      if (!polygon || !polygon.geometry || polygon.geometry.type !== 'Polygon') {
        return NextResponse.json(
          { error: `Invalid polygon data at index ${i}. Expected GeoJSON Polygon feature.` },
          { status: 400 }
        )
      }

      if (!polygon.geometry.coordinates || !Array.isArray(polygon.geometry.coordinates[0])) {
        return NextResponse.json(
          { error: `Invalid coordinates in polygon at index ${i}` },
          { status: 400 }
        )
      }
    }

    try {
      const wktPolygons = polygons.map(polygon => {
        const coordinates = polygon.geometry.coordinates[0]
        return `POLYGON((${coordinates
          .map(([lng, lat]) => `${lng} ${lat}`)
          .join(', ')}))`
      })
      
      if (wktPolygons.length === 1) {
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
            l.longitude::float as longitude,
            l."isAssumable" as "isAssumable",
            l."denormalizedAssumableInterestRate"::float as "denormalizedAssumableInterestRate"
          FROM "Listing" l
          WHERE ST_Contains(
            ST_SetSRID(ST_GeomFromText(${wktPolygons[0]}), 4326),
            ST_SetSRID(ST_MakePoint(l.longitude::float, l.latitude::float), 4326)
          )
          AND l."isAssumable" = true
        `
        return NextResponse.json(listings)
      }
      
      let unionQuery = `SELECT ST_Union(ARRAY[`
      
      try {
        unionQuery += wktPolygons.map(wkt => 
          `ST_SetSRID(ST_GeomFromText('${wkt}'), 4326)`
        ).join(',')
        
        unionQuery += `]) as union_geom`
        
        const fullQuery = `
          WITH union_geom AS (${unionQuery})
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
            l.longitude::float as longitude,
            l."isAssumable" as "isAssumable",
            l."denormalizedAssumableInterestRate"::float as "denormalizedAssumableInterestRate"
          FROM "Listing" l, union_geom
          WHERE ST_Contains(
            union_geom.union_geom,
            ST_SetSRID(ST_MakePoint(l.longitude::float, l.latitude::float), 4326)
          )
          AND l."isAssumable" = true
        `;
        
        const unionResult = await prisma.$queryRawUnsafe<any[]>(fullQuery);
        
        return NextResponse.json(unionResult)
      } catch (dbError) {
        console.error('Database error details:', dbError);
        console.error('Error stack:', dbError instanceof Error ? dbError.stack : 'No stack available');
        return NextResponse.json(
          { 
            error: 'Database query failed', 
            details: dbError instanceof Error ? dbError.message : String(dbError)
          },
          { status: 500 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to perform polygon search', 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to perform polygon search', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
