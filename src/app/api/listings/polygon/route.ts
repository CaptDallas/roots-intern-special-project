import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Feature, Polygon } from 'geojson'
import { SearchAggregations } from '@/types'

export async function POST(request: Request) {
  try {
    // Extract query parameters from URL
    const url = new URL(request.url);
    const showOnlyAssumable = url.searchParams.get('assumable') === 'true';
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '10000000'); // Default high upper bound
    const limit = parseInt(url.searchParams.get('limit') || '1000'); // Default to 1000 listings max
    
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
      
      // Build the WHERE clause for filtering
      let filterConditions = '';
      if (showOnlyAssumable) {
        filterConditions += ` AND l."isAssumable" = true`;
      }
      if (minPrice > 0) {
        filterConditions += ` AND l.price::float >= ${minPrice}`;
      }
      if (maxPrice < 10000000) {
        filterConditions += ` AND l.price::float <= ${maxPrice}`;
      }
      
      if (wktPolygons.length === 1) {
        try {
          // For single polygon case, apply filter conditions directly in the SQL string
          // This avoids issues with the template literal tag
          let singlePolygonQuery = `
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
              ST_SetSRID(ST_GeomFromText('${wktPolygons[0]}'), 4326),
              ST_SetSRID(ST_MakePoint(l.longitude::float, l.latitude::float), 4326)
            )
            ${filterConditions}
            LIMIT ${limit}
          `;
          
          const listings = await prisma.$queryRawUnsafe<any[]>(singlePolygonQuery);
          
          // Calculate aggregations
          const aggregations = calculateAggregations(listings)
          
          return NextResponse.json({
            listings,
            aggregations,
            totalCount: listings.length
          })
        } catch (singlePolygonError) {
          console.error('Error in single polygon query:', singlePolygonError);
          return NextResponse.json(
            { 
              error: 'Failed to process single polygon query', 
              details: singlePolygonError instanceof Error ? singlePolygonError.message : String(singlePolygonError)
            },
            { status: 500 }
          );
        }
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
          ${filterConditions}
          LIMIT ${limit}
        `;
        
        const listings = await prisma.$queryRawUnsafe<any[]>(fullQuery);
        
        // Calculate aggregations
        const aggregations = calculateAggregations(listings)
        
        return NextResponse.json({
          listings,
          aggregations,
          totalCount: listings.length
        })
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


// Helper function to calculate aggregations from listings
function calculateAggregations(listings: any[]): SearchAggregations {
  // Total listings count
  const totalListings = listings.length;
  
  // Assumable listings
  const assumableListings = listings.filter(listing => listing.isAssumable);
  const assumableCount = assumableListings.length;
  
  // Calculate median interest rate
  const medianLoanRate = (() => {
    if (!assumableListings.length) return 0;
    
    // Filter out listings with no interest rate and sort them
    const rates = assumableListings
      .map(listing => listing.denormalizedAssumableInterestRate)
      .filter(rate => rate !== undefined && rate !== null)
      .sort((a, b) => a - b);
    
    if (!rates.length) return 0;
    
    // Get the middle value for median calculation
    const midIndex = Math.floor(rates.length / 2);
    
    // If even number of elements, average the middle two
    if (rates.length % 2 === 0) {
      return (rates[midIndex - 1] + rates[midIndex]) / 2;
    }
    // If odd number of elements, return the middle one
    return rates[midIndex];
  })();
  
  // Calculate average prices
  const avgPrice = totalListings 
    ? listings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / totalListings 
    : 0;
    
  const avgAssumablePrice = assumableCount 
    ? assumableListings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / assumableCount 
    : 0;
  
  // Get property types distribution
  const propertyTypes: Record<string, number> = listings.reduce((acc, listing) => {
    const type = listing.propertyType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalListings,
    assumableListings: assumableCount,
    medianLoanRate,
    avgPrice,
    avgAssumablePrice,
    propertyTypes
  };
}
