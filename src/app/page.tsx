'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Badge, HStack } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types/listing';
import { MAP_CONTAINER_STYLES } from './styles/mapContainer';
import { BRAND_GREEN } from './styles/mapStyles';

// Shadow style to be applied to all buttons
const BUTTON_SHADOW = "0px 4px 10px rgba(0,0,0,0.2)";

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap'),
  { ssr: false, loading: () => <p>Loading map…</p> }
);

const Dashboard = dynamic(
  () => import('../components/Dashboard'),
  { ssr: false }
);

type ViewMode = 'listings' | 'dashboard';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polygons, setPolygons] = useState<Feature<Polygon>[]>([])
  const [showOnlyAssumable, setShowOnlyAssumable] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('listings')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  
  // Reference to store the drawing mode function
  const enableDrawingRef = useRef<(() => boolean) | null>(null);
  
  // Function to enable drawing mode
  const enableDrawing = () => {
    if (enableDrawingRef.current) {
      const success = enableDrawingRef.current();
      if (success) {
        // Optional: show a success message or change button state
        console.log('Drawing mode enabled');
      }
    }
  };

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
      setPolygons(prev => [...prev, polygon as Feature<Polygon>]);
    } else if (action === 'delete' && polygon) {
      setPolygons(prev => prev.filter(p => p.id !== polygon.id));
    } else if (action === 'clear' || !action) {
      setPolygons([]);
    }
  }

  const toggleAssumableFilter = () => {
    setShowOnlyAssumable(!showOnlyAssumable);
  };

  const handleListingClick = useCallback((listing: Listing) => {
    if (!selectedListings.some(selected => selected.id === listing.id)) {
      setSelectedListings(prev => [...prev, listing]);
    }
  }, [selectedListings]);

  const clearSelectedListings = useCallback(() => {
    setSelectedListings([]);
  }, []);

  const filteredListings = showOnlyAssumable 
    ? selectedListings.filter(listing => listing.isAssumable)
    : selectedListings;

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'listings' ? 'dashboard' : 'listings');
    if (!isPanelOpen) {
      setIsPanelOpen(true);
    }
  };

  // Add keyboard shortcut for panel toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        togglePanel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPanelOpen]); // Re-create the event listener when isPanelOpen changes

  return (
    <Box position="relative" height="100vh" overflow="hidden">
      <Box 
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
      >
        <InteractiveMap
          listings={listings}
          onPolygonChange={handlePolygonChange}
          onListingClick={handleListingClick}
          polygons={polygons}
          onEnableDrawingRef={enableDrawingRef}
        />
      </Box>
      
      <Flex 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={10} 
        justifyContent="space-between" 
        alignItems="center" 
        p={6} 
        bg="transparent"
        pointerEvents="none"
      >
        <Box pointerEvents="auto">
          <Heading textShadow={BUTTON_SHADOW} as="h1" size="2xl">Roots Homes</Heading>
          <Heading boxShadow={BUTTON_SHADOW} textAlign="center" bg="black" color={BRAND_GREEN} p={0} borderRadius="lg" as="h1" size="3xl">Explorer</Heading>
        </Box>

        <HStack gap={4}>
          <Button
            pointerEvents="auto"
            variant="outline"
            colorScheme="gray"
            onClick={toggleViewMode}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            {viewMode === 'listings' ? 'View Dashboard' : 'View Listings'}
          </Button>
          
          {/* Drawing mode button */}
          <Button
            pointerEvents="auto"
            colorScheme="green"
            variant="solid"
            onClick={enableDrawing}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            Enable Drawing
          </Button>
          
          <Button
            pointerEvents="auto"
            colorScheme="blue"
            onClick={fetchRecentListings}
            loading={loading}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            {loading ? 'Fetching...' : 'Fetch Recent Listings'}
          </Button>

          <Button
            pointerEvents="auto"
            colorScheme="green"
            onClick={fetchPolygonListings}
            disabled={polygons.length === 0}
            loading={loading}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            {loading ? 'Searching...' : 'Search All Regions'}
          </Button>
          
          {polygons.length > 0 && (
            <Button
              pointerEvents="auto"
              colorScheme="red"
              onClick={() => setPolygons([])}
              boxShadow={BUTTON_SHADOW}
              _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
            >
              Clear Polygons ({polygons.length})
            </Button>
          )}

          {selectedListings.length > 0 && (
            <Button
              pointerEvents="auto"
              colorScheme="gray"
              onClick={clearSelectedListings}
              boxShadow={BUTTON_SHADOW}
              _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
            >
              Clear Favorites ({selectedListings.length})
            </Button>
          )}
          
          <Button 
            pointerEvents="auto"
            colorScheme="blackAlpha" 
            onClick={togglePanel}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            {isPanelOpen ? "Hide Panel (S)" : "Show Panel (S)"}
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Box position="absolute" top="120px" left={0} right={0} zIndex={10} mx="auto" maxW="800px" pointerEvents="auto">
          <Box p={4} bg="red.100" color="red.800" borderRadius="md">
            {error}
          </Box>
        </Box>
      )}
      
      {/* Slide-in panel for listings or dashboard */}
      <Box
        position="absolute"
        top="120px"
        right={0}
        height="calc(100vh - 120px)"
        width="500px"
        bg="white"
        boxShadow="-5px 0 10px rgba(0,0,0,0.1)"
        transform={isPanelOpen ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.3s ease-in-out"
        zIndex={5}
        overflow="auto"
        p={6}
      >
        {viewMode === 'listings' ? (
          <VStack align="stretch" gap={6}>
            <Heading size="md">
              {selectedListings.length} Selected Listings
            </Heading>
            <SimpleGrid columns={1} gap={6}>
              {selectedListings.map((listing) => (
                <Box
                  key={listing.id}
                  borderWidth={selectedListings.some(selected => selected.id === listing.id) ? "2px" : "1px"}
                  borderRadius="lg"
                  overflow="hidden"
                  p={4}
                  position="relative"
                  borderColor={selectedListings.some(selected => selected.id === listing.id) ? BRAND_GREEN : "inherit"}
                >
                  {listing.isAssumable && (
                    <Badge 
                      position="absolute" 
                      top="2" 
                      right="2" 
                      bg={BRAND_GREEN} 
                      color="black"
                      zIndex="1"
                    >
                      Assumable
                    </Badge>
                  )}
                  {listing.photoUrls && listing.photoUrls[0] && (
                    <Image
                      src={listing.photoUrls[0]}
                      alt={listing.address}
                      height="120px"
                      width="100%"
                      objectFit="cover"
                      borderRadius="md"
                      onError={(e) => {
                        console.error('Card image failed to load:', e.currentTarget.src);
                      }}
                    />
                  )}
                  <VStack align="start" mt={4} gap={2}>
                    <Text fontWeight="bold" fontSize="lg">
                      ${listing.price.toLocaleString()}
                    </Text>
                    <Text fontSize="sm">{listing.address}</Text>
                    {listing.city && listing.state && (
                      <Text fontSize="sm">{`${listing.city}, ${listing.state}`}</Text>
                    )}
                    <Text fontSize="sm">
                      {listing.bedrooms && `${listing.bedrooms} beds`}
                      {listing.bathrooms && ` • ${listing.bathrooms} baths`}
                      {listing.squareFeet && ` • ${listing.squareFeet} sqft`}
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      {listing.propertyType}
                    </Text>
                    <Text color="blue.500" fontSize="xs">
                      {listing.status}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        ) : (
          <Dashboard listings={listings} />
        )}
      </Box>
      
      {/* Toggle button at the side (alternative to the header button) */}
      <Button
        position="absolute"
        top="50%"
        right={isPanelOpen ? "500px" : "0"}
        transform="translateY(-50%) translateX(-50%) rotate(-90deg)"
        zIndex={6}
        colorScheme="blackAlpha"
        onClick={togglePanel}
        transition="right 0.3s ease-in-out"
        size="sm"
        pointerEvents="auto"
        boxShadow={BUTTON_SHADOW}
        _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
      >
        {isPanelOpen ? "Hide (S)" : "Show (S)"}
      </Button>
    </Box>
  )
}
