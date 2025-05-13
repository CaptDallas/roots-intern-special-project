'use client'

import { useState } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types/listing';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<Feature<Polygon> | null>(null)
  const [showOnlyAssumable, setShowOnlyAssumable] = useState(false)

  // Use 'recent' API endpoint to get listings
  const fetchRecentListings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/listings/recent')
      if (!response.ok) {
        throw new Error('Failed to fetch recent listings')
      }
      const data = await response.json()
      setListings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Use polygon API endpoint to get listings
  const fetchPolygonListings = async () => {
    if (!currentPolygon) {
      setError('Please draw a polygon on the map first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/listings/polygon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentPolygon)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch polygon listings')
      }
      const data = await response.json()
      setListings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePolygonChange = (polygon: Feature<Geometry> | null) => {
    if (polygon && polygon.geometry.type === 'Polygon') {
      setCurrentPolygon(polygon as Feature<Polygon>)
    } else {
      setCurrentPolygon(null)
    }
  }

  const handleMapClick = () => {
    setShowMap(!showMap)
  }

  // Toggle whether to show only assumable listings
  const toggleAssumableFilter = () => {
    setShowOnlyAssumable(!showOnlyAssumable);
  };

  // Filter listings based on the showOnlyAssumable state
  const filteredListings = showOnlyAssumable 
    ? listings.filter(listing => listing.isAssumable)
    : listings;

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-6xl">
        <Heading>Roots Home Explorer</Heading>
        
        <Button
          colorScheme="blue"
          onClick={fetchRecentListings}
          loading={loading}
        >
          {loading ? 'Fetching...' : 'Fetch Recent Listings'}
        </Button>

        <Button
          colorScheme="red"
          onClick={handleMapClick}
        >
          {showMap ? 'Hide Map' : 'Show Map'}
        </Button>

        {showMap && (
          <InteractiveMap
            listings={filteredListings}
            onPolygonChange={handlePolygonChange}
          />
        )}

        <Button
          colorScheme="green"
          onClick={fetchPolygonListings}
          disabled={!currentPolygon}
          loading={loading}
        >
          {loading ? 'Searching...' : 'Search in Polygon'}
        </Button>

        <Button
          colorScheme="purple"
          onClick={toggleAssumableFilter}
        >
          {showOnlyAssumable ? 'Show All Listings' : 'Show Only Assumable'}
        </Button>

        {error && (
          <Text color="red.500">Error: {error}</Text>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6} width="100%">
          {filteredListings.map((listing) => (
            <Box
              key={listing.id}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p={4}
            >
              {listing.photoUrls && listing.photoUrls[0] && (
                <>
                  <Image
                    src={listing.photoUrls[0]}
                    alt={listing.address}
                    height="200px"
                    width="100%"
                    objectFit="cover"
                    borderRadius="md"
                    onError={(e) => {
                      console.error('Card image failed to load:', e.currentTarget.src);
                    }}
                  />
                </>
              )}
              <VStack align="start" mt={4} gap={2}>
                <Text fontWeight="bold" fontSize="xl">
                  ${listing.price.toLocaleString()}
                </Text>
                <Text>{listing.address}</Text>
                {listing.city && listing.state && (
                  <Text>{`${listing.city}, ${listing.state}`}</Text>
                )}
                <Text>
                  {listing.bedrooms && `${listing.bedrooms} beds`}
                  {listing.bathrooms && ` • ${listing.bathrooms} baths`}
                  {listing.squareFeet && ` • ${listing.squareFeet} sqft`}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  {listing.propertyType}
                </Text>
                <Text color="blue.500" fontSize="sm">
                  {listing.status}
                </Text>
                {listing.isAssumable && (
                  <Text color="green.500" fontSize="sm" fontWeight="bold">
                    Assumable
                  </Text>
                )}
                <Text color="red.500" fontSize="sm">
                  {listing.latitude}
                </Text>
                <Text color="red.500" fontSize="sm">
                  {listing.longitude}
                </Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </main>
    </div>
  )
}
