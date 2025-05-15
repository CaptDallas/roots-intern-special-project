'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Badge, HStack } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon, Geometry } from 'geojson';
import { Listing } from '@/types';
import { COLORS, SHADOWS } from './styles/theme';
import { SearchResult } from '@/types';

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
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([])
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawingPolygons, setDrawingPolygons] = useState<Feature<Polygon>[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('listings')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  
  // Reference to store the drawing mode function
  const enableDrawingRef = useRef<(() => boolean) | null>(null);
  
  // Reference to store the focus region function
  const focusRegionRef = useRef<((polygons: Feature<Polygon>[]) => void) | null>(null);
  
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

  // Get polygons (region) from the active search
  const historicalPolygons = useMemo(() => {
    if (searchHistory.length === 0 || activeSearchIndex < 0) return [];
    return searchHistory[activeSearchIndex]?.polygons || [];
  }, [searchHistory, activeSearchIndex]);

  // Filter search history for display
  const visibleSearchResults = useMemo(() => {
    if (searchHistory.length === 0) return [];
    
    // Always include all search history
    // This ensures that all previous searches are displayed with appropriate colors
    return [...searchHistory];
  }, [searchHistory]);


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
        listings: data.listings, // Use listings from the new response format
        aggregations: data.aggregations // Include the aggregations
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


  const switchToNextSearch = useCallback(() => {
    if (activeSearchIndex > 0) {
      setActiveSearchIndex(activeSearchIndex - 1);
    }
  }, [activeSearchIndex]);

  const switchToPreviousSearch = useCallback(() => {
    if (activeSearchIndex < searchHistory.length - 1) {
      setActiveSearchIndex(activeSearchIndex + 1);
    }
  }, [activeSearchIndex, searchHistory.length]);

  const handlePolygonChange = (polygon: Feature<Geometry> | null, action?: 'create' | 'delete' | 'clear') => {
    if (action === 'create' && polygon && polygon.geometry.type === 'Polygon') {
      setDrawingPolygons(prev => [...prev, polygon as Feature<Polygon>]);
    } else if (action === 'delete' && polygon) {
      setDrawingPolygons(prev => prev.filter(p => p.id !== polygon.id));
    } else if (action === 'clear' || !action) {
      setDrawingPolygons([]);
    }
  }

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
  
  // Add keyboard shortcuts for search navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when user is typing in an input field
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      
      if (searchHistory.length > 1) {
        if (e.key === 'ArrowLeft') {
          // Previous (older) search
          if (activeSearchIndex < searchHistory.length - 1) {
            e.preventDefault(); // Prevent scrolling
            switchToPreviousSearch();
          }
        } else if (e.key === 'ArrowRight') {
          // Next (newer) search
          if (activeSearchIndex > 0) {
            e.preventDefault(); // Prevent scrolling
            switchToNextSearch();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSearchIndex, searchHistory.length, switchToNextSearch, switchToPreviousSearch]);

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
          searchResults={visibleSearchResults}
          currentDrawing={drawingPolygons}
          onEnableDrawingRef={enableDrawingRef}
          onFocusRegionRef={focusRegionRef}
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
        paddingLeft={10}
        paddingRight={10}
        bg="transparent"
        pointerEvents="none"
      >
        <Box pointerEvents="auto">
          <Heading textShadow={BUTTON_SHADOW} as="h1" size="2xl">Roots Homes</Heading>
          <Heading boxShadow={BUTTON_SHADOW} textAlign="center" bg="black" color={COLORS.brand.green} p={0} borderRadius="lg" as="h1" size="3xl">Explorer</Heading>
        </Box>

        <Flex gap={5} alignItems="center" flexWrap="wrap" justifyContent="flex-end" pointerEvents="auto">
          {searchHistory.length > 1 && (  
            <Box 
              bg="white"
              borderRadius="lg"
              boxShadow={BUTTON_SHADOW}
              p={2}
            >
              <HStack gap={2} alignItems="center">
                <Text fontWeight="semibold" fontSize="xs" color="gray.600" mr={1}>
                  SEARCHES:
                </Text>
                
                <Button 
                  size="sm" 
                  colorScheme="blue"
                  onClick={switchToPreviousSearch}
                  disabled={activeSearchIndex >= searchHistory.length - 1}
                >
                  ← Older
                </Button>
                
                <Text fontSize="sm" fontWeight="medium" mx={1}>
                  {activeSearchIndex + 1}/{searchHistory.length}
                </Text>
                
                <Button 
                  size="sm"
                  colorScheme="blue"
                  onClick={switchToNextSearch}
                  disabled={activeSearchIndex <= 0}
                >
                  Newer →
                </Button>
              </HStack>
            </Box>
          )}

          <HStack gap={2} flexWrap="wrap" justifyContent="flex-end">
            <Button
              size="md"
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
              size="md"
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

            {drawingPolygons.length > 0 && (
              <>
                <Button
                  size="md"
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
                  size="md"
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
          </HStack>
        </Flex>
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
        width="600px"
        bg="white"
        boxShadow="-5px 0 15px rgba(0,0,0,0.15)"
        transform={isPanelOpen ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.3s ease-in-out"
        zIndex={5}
        overflow="auto"
        p={8}
      >
        {viewMode === 'listings' ? (
          <VStack align="stretch" gap={6}>
            <Heading size="md">
              {searchHistory.length > 0 ? 
                `${listings.length} Listings Found` : 
                "No Search Results Yet"
              }
            </Heading>
            {searchHistory.length > 0 && (
              <Text fontSize="sm" color="gray.600">
                {searchHistory[activeSearchIndex] && 
                  `Search performed on ${new Date(searchHistory[activeSearchIndex].timestamp).toLocaleString()}`
                }
              </Text>
            )}
            <SimpleGrid columns={3} gap={4}>
              {/* Limit to 9 listings */}
              {listings.slice(0, 9).map((listing) => (
                <Box
                  key={listing.id}
                  borderWidth={"2px"}
                  borderRadius="lg"
                  overflow="hidden"
                  position="relative"
                  borderColor={COLORS.brand.green}
                  height="100%"
                  display="flex"
                  flexDirection="column"
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
                      height="100px"
                      width="100%"
                      objectFit="cover"
                      borderRadius="md"
                      onError={(e) => {
                        console.error('Card image failed to load:', e.currentTarget.src);
                      }}
                    />
                  )}
                  <VStack align="start" p={3} gap={1} flex="1">
                    <Text fontWeight="bold" fontSize="md">
                      ${listing.price.toLocaleString()}
                    </Text>
                    <Text 
                      fontSize="xs" 
                      maxWidth="100%"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                    >
                      {listing.address}
                    </Text>
                    {listing.city && listing.state && (
                      <Text 
                        fontSize="xs"
                        maxWidth="100%"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {`${listing.city}, ${listing.state}`}
                      </Text>
                    )}
                    <Text fontSize="xs">
                      {listing.bedrooms && `${listing.bedrooms} beds`}
                      {listing.bathrooms && ` • ${listing.bathrooms} baths`}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {listing.propertyType}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
            
            {/* Display message if there are more listings */}
            {listings.length > 9 && (
              <Box 
                p={4} 
                borderRadius="lg" 
                bg="gray.100" 
                textAlign="center"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Text fontWeight="medium">
                  + {listings.length - 9} more listings not shown
                </Text>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Viewing 9 of {listings.length} total listings
                </Text>
              </Box>
            )}
          </VStack>
        ) : (
          <Dashboard 
            searchHistory={searchHistory}
            activeSearchIndex={activeSearchIndex}
          />
        )}
      </Box>
      
      {/* Toggle button at the side */}
      <Button
        position="absolute"
        top="50%"
        right={isPanelOpen ? "600px" : "0"}
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
