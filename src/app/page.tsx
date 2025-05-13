'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Grid, GridItem, Badge } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types/listing';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true) // Default to showing the map
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

  // Handle when a user clicks on a listing marker in the map
  const handleListingClick = useCallback((listing: Listing) => {
    // Check if the listing is already in the selected listings
    if (!selectedListings.some(selected => selected.id === listing.id)) {
      setSelectedListings(prev => [...prev, listing]);
    }
  }, [selectedListings]);

  // Clear selected listings
  const clearSelectedListings = useCallback(() => {
    setSelectedListings([]);
  }, []);

  // Filter listings based on the showOnlyAssumable state
  const filteredListings = showOnlyAssumable 
    ? selectedListings.filter(listing => listing.isAssumable)
    : selectedListings;

  return (
    <Box padding="0" maxWidth="1800px" margin="0 auto">
      <Heading 
        textAlign="center" 
        marginBottom="6" 
        padding="4"
        borderRadius="lg"
        bg="#CDFF64"
        color="black"
        boxShadow="md"
        fontSize={{ base: "xl", md: "2xl", lg: "3xl" }}
      >
        Roots Home Explorer
      </Heading>
      
      <Flex justifyContent="center" gap="4" marginBottom="6">
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

        {selectedListings.length > 0 && (
          <Button
            colorScheme="gray"
            onClick={clearSelectedListings}
          >
            Clear Favorites ({selectedListings.length})
          </Button>
        )}
      </Flex>

      {error && (
        <Text color="red.500" textAlign="center" marginBottom="4">Error: {error}</Text>
      )}

      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="6">
        {/* Map Column */}
        {showMap && (
          <GridItem position="sticky" top="0">
            <Box height={{ base: "500px", lg: "calc(100vh - 200px)" }} borderRadius="lg" overflow="hidden">
              <InteractiveMap
                listings={listings}
                onPolygonChange={handlePolygonChange}
                onListingClick={handleListingClick}
              />
            </Box>
          </GridItem>
        )}
        {/* Listings Column */}
        <GridItem overflow="auto" maxHeight={{ lg: "calc(100vh - 200px)" }} paddingRight={{ base: "0", md: "6" }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            {selectedListings.map((listing) => (
              <Box
                key={listing.id}
                borderWidth={selectedListings.some(selected => selected.id === listing.id) ? "2px" : "1px"}
                borderRadius="lg"
                overflow="hidden"
                p={4}
                position="relative"
                borderColor={selectedListings.some(selected => selected.id === listing.id) ? "#CDFF64" : "inherit"}
              >
                {listing.isAssumable && (
                  <Badge 
                    position="absolute" 
                    top="2" 
                    right="2" 
                    bg="#CDFF64" 
                    color="black"
                    zIndex="1"
                  >
                    Assumable
                  </Badge>
                )}
                {listing.photoUrls && listing.photoUrls[0] && (
                  <>
                    <Image
                      src={listing.photoUrls[0]}
                      alt={listing.address}
                      height="150px"
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
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </GridItem>
      </Grid>
    </Box>
  )
}
