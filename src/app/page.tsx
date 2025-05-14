'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Badge, HStack } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types';
import { MAP_CONTAINER_STYLES } from './styles/mapContainer';
import { COLORS, SHADOWS } from './styles/theme';
import { SearchResult } from '@/types';

// Shadow style to be applied to all buttons
const BUTTON_SHADOW = SHADOWS.md;

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
  // Replace the listings state with a search history array
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([])
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(0)
  
  const [selectedListings, setSelectedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawingPolygons, setDrawingPolygons] = useState<Feature<Polygon>[]>([])
  const [showHistoricalPolygons, setShowHistoricalPolygons] = useState(false)
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

  // Get current active listings from search history
  const listings = useMemo(() => {
    if (searchHistory.length === 0) return [];
    return searchHistory[activeSearchIndex]?.listings || [];
  }, [searchHistory, activeSearchIndex]);

  // Get historical polygons from the active search
  const historicalPolygons = useMemo(() => {
    if (!showHistoricalPolygons || searchHistory.length === 0 || activeSearchIndex < 0) return [];
    return searchHistory[activeSearchIndex]?.polygons || [];
  }, [searchHistory, activeSearchIndex, showHistoricalPolygons]);

  // Filter search history for display
  const visibleSearchResults = useMemo(() => {
    if (searchHistory.length === 0) return [];
    
    // Always include all search history
    // This ensures that all previous searches are displayed with appropriate colors
    return [...searchHistory];
  }, [searchHistory]);

  const fetchRecentListings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/listings/recent')
      if (!response.ok) {
        throw new Error('Failed to fetch recent listings')
      }
      const data = await response.json()
      
      // Create a new search result
      const newSearch: SearchResult = {
        id: `recent_${Date.now()}`,
        timestamp: new Date(),
        polygons: [], // No polygons for recent listings
        listings: data
      };
      
      // Add to search history
      setSearchHistory(prev => [newSearch, ...prev]);
      setActiveSearchIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchPolygonListings = async () => {
    if (drawingPolygons.length === 0) {
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
        body: JSON.stringify(drawingPolygons)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch polygon listings')
      }
      const data = await response.json()
      
      // Create a new search result
      const newSearch: SearchResult = {
        id: `polygon_${Date.now()}`,
        timestamp: new Date(),
        polygons: [...drawingPolygons], // Create a copy of the polygons array
        listings: data
      };
      
      // Add to search history
      setSearchHistory(prev => [newSearch, ...prev]);
      setActiveSearchIndex(0);
      
      // Clear drawing polygons and enable drawing mode for the next region
      setDrawingPolygons([]);
      
      // Enable drawing mode after a short delay to ensure clean state
      setTimeout(() => {
        if (enableDrawingRef.current) {
          enableDrawingRef.current();
        }
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Function to cycle through search history
  const switchToNextSearch = () => {
    if (activeSearchIndex > 0) {
      setActiveSearchIndex(activeSearchIndex - 1);
    }
  };

  const switchToPreviousSearch = () => {
    if (activeSearchIndex < searchHistory.length - 1) {
      setActiveSearchIndex(activeSearchIndex + 1);
    }
  };

  const handlePolygonChange = (polygon: Feature<Geometry> | null, action?: 'create' | 'delete' | 'clear') => {
    if (action === 'create' && polygon && polygon.geometry.type === 'Polygon') {
      setDrawingPolygons(prev => [...prev, polygon as Feature<Polygon>]);
    } else if (action === 'delete' && polygon) {
      setDrawingPolygons(prev => prev.filter(p => p.id !== polygon.id));
    } else if (action === 'clear' || !action) {
      setDrawingPolygons([]);
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

  // Toggle showing historical polygons
  const toggleHistoricalPolygons = useCallback(() => {
    setShowHistoricalPolygons(prev => !prev);
  }, []);

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
          searchResults={visibleSearchResults}
          currentDrawing={drawingPolygons}
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
          <Heading boxShadow={BUTTON_SHADOW} textAlign="center" bg="black" color={COLORS.brand.green} p={0} borderRadius="lg" as="h1" size="3xl">Explorer</Heading>
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
            onClick={() => {
              setDrawingPolygons([]);  // Clear existing polygons
              enableDrawing();         // Enable drawing mode
            }}
            boxShadow={BUTTON_SHADOW}
            _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
          >
            New Region
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

          {drawingPolygons.length > 0 && (
            <>
              <Button
                pointerEvents="auto"
                colorScheme="green"
                onClick={() => {
                  fetchPolygonListings();
                }}
                loading={loading}
                boxShadow={BUTTON_SHADOW}
                _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
              >
                {loading ? 'Searching...' : 'Search Region'}
              </Button>
              
              <Button
                pointerEvents="auto"
                colorScheme="red"
                variant="outline"
                onClick={() => {
                  setDrawingPolygons([]);
                }}
                boxShadow={BUTTON_SHADOW}
                _hover={{ boxShadow: "0px 6px 12px rgba(0,0,0,0.25)" }}
              >
                Clear
              </Button>
            </>
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
                  borderColor={selectedListings.some(selected => selected.id === listing.id) ? COLORS.brand.green : "inherit"}
                >
                  {listing.isAssumable && (
                    <Badge 
                      position="absolute" 
                      top="2" 
                      right="2" 
                      bg={COLORS.brand.green} 
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
          <Dashboard 
            searchHistory={searchHistory}
            activeSearchIndex={activeSearchIndex}
            onNextSearch={switchToNextSearch}
            onPreviousSearch={switchToPreviousSearch}
            showHistoricalPolygons={showHistoricalPolygons}
            onToggleHistoricalPolygons={toggleHistoricalPolygons}
          />
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
