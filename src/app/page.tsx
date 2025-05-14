'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Grid, GridItem, Badge, HStack } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types/listing';
import { MAP_CONTAINER_STYLES } from './styles/mapContainer';
import { BRAND_GREEN } from './styles/mapStyles';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

const Dashboard = dynamic(
  () => import('../components/Dashboard'),
  { ssr: false }
);

// View mode type for toggling between listings and dashboard
type ViewMode = 'listings' | 'dashboard';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polygons, setPolygons] = useState<Feature<Polygon>[]>([])
  const [showOnlyAssumable, setShowOnlyAssumable] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('listings')

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

  // Toggle between listings and dashboard views
  const toggleViewMode = () => {
    setViewMode(viewMode === 'listings' ? 'dashboard' : 'listings');
  };

  return (
    <Box>
      <VStack gap={6} align="stretch">
        <Flex justifyContent="space-between" alignItems="center" p={6} bg={BRAND_GREEN}>
          <Heading textAlign="center" as="h1" size="3xl">Roots Home Explorer</Heading>
          
          <HStack gap={4}>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={toggleViewMode}
            >
              {viewMode === 'listings' ? 'View Dashboard' : 'View Listings'}
            </Button>
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
          </HStack>
        </Flex>

        {/* Action buttons for fetching listings */}
        <Flex gap={4} wrap="wrap">
          <Button
            onClick={() => setShowOnlyAssumable(!showOnlyAssumable)}
            variant={showOnlyAssumable ? "solid" : "outline"}
            colorScheme="green"
          >
            {showOnlyAssumable ? "Showing Assumable Only" : "Show All Listings"}
          </Button>
          
          {/* Clear polygon button - only show if polygons exist */}
          {polygons.length > 0 && (
            <Button
              onClick={() => {
                setPolygons([]);
                // Reset to showing all listings if we were filtering
                if (selectedListings.length < listings.length) {
                  setSelectedListings(listings);
                }
              }}
              colorScheme="red"
              variant="outline"
            >
              Clear Polygons ({polygons.length})
            </Button>
          )}
        </Flex>

        {error && (
          <Box p={4} bg="red.100" color="red.800" borderRadius="md">
            {error}
          </Box>
        )}

        <Text>Showing {selectedListings.length} of {listings.length} listings</Text>

        <Grid {...MAP_CONTAINER_STYLES.mainGrid}>
          {/* Map Column */}
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
          
          {/* Listings/Dashboard Column */}
          <GridItem {...MAP_CONTAINER_STYLES.listingsContainer}>
            {viewMode === 'listings' ? (
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
            ) : (
              <Dashboard listings={listings} />
            )}
          </GridItem>
        </Grid>
      </VStack>
    </Box>
  )
}
