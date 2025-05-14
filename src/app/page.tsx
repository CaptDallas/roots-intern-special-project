'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Grid, GridItem, Badge } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types/listing';
import { MAP_CONTAINER_STYLES } from './styles/mapContainer';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polygons, setPolygons] = useState<Feature<Polygon>[]>([])
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
    if (polygons.length === 0) {
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
        body: JSON.stringify(polygons)
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

  const handlePolygonChange = (polygon: Feature<Geometry> | null, action?: 'create' | 'delete' | 'clear') => {
    if (action === 'create' && polygon && polygon.geometry.type === 'Polygon') {
      // Add new polygon to the array
      setPolygons(prev => [...prev, polygon as Feature<Polygon>]);
    } else if (action === 'delete' && polygon) {
      // Remove specific polygon from the array
      setPolygons(prev => prev.filter(p => p.id !== polygon.id));
    } else if (action === 'clear' || !action) {
      // Clear all polygons
      setPolygons([]);
    }
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
          colorScheme="green"
          onClick={fetchPolygonListings}
          disabled={polygons.length === 0}
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

        {polygons.length > 0 && (
          <Button
            colorScheme="red"
            onClick={() => setPolygons([])}
          >
            Clear Polygons ({polygons.length})
          </Button>
        )}

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

      <Grid {...MAP_CONTAINER_STYLES.mainGrid}>
        {/* Map Column */}
        {
          <GridItem {...MAP_CONTAINER_STYLES.mapGridItem}>
            <Box {...MAP_CONTAINER_STYLES.mapBox}>
              <InteractiveMap
                listings={listings}
                onPolygonChange={handlePolygonChange}
                onListingClick={handleListingClick}
                polygons={polygons}
              />
            </Box>
          </GridItem>
        }
        {/* Listings Column */}
        <GridItem {...MAP_CONTAINER_STYLES.listingsContainer}>
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
