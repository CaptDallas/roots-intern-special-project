'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button, Heading, VStack, Text, Image, Box, SimpleGrid, Flex, Badge, HStack } from "@chakra-ui/react"
import dynamic from 'next/dynamic';
import { Feature, Polygon } from 'geojson';
import { Listing } from '@/types';
import { COLORS, SHADOWS } from './styles/theme';
import { SearchResult } from '@/types';
import { searchByPolygons } from '@/services/listing.service';
import MapContainer from '@/components/MapContainer';
import SearchNavigator from '@/components/SearchNavigator';

const BUTTON_SHADOW = SHADOWS.md;

const Dashboard = dynamic(
  () => import('../components/Dashboard'),
  { ssr: false }
);

type ViewMode = 'listings' | 'dashboard';

/**
 * Home Page Component
 * 
 * The main application page that coordinates all major components and manages state.
 * 
 * Features:
 * - Maintains search history state and accessess backend for search results
 * - Maintains state for currently active search
 * - Provides UI for switching between listings and dashboard views
 * - Manages the slide-in panel for listings and dashboard
 * - Handles keyboard shortcuts
 * 
 * @returns {JSX.Element} The main application page
 */
export default function Home() {
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([])
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('listings')
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Get current listings from active search
  const listings = useMemo(() => {
    return searchHistory[activeSearchIndex]?.listings || [];
  }, [searchHistory, activeSearchIndex]);

  // Handle new search region from MapContainer
  const handleSearchRegion = useCallback(async (polygons: Feature<Polygon>[]) => {
    if (polygons.length === 0) {
      setError('Please draw a polygon on the map first')
      return Promise.reject(new Error('No polygons drawn'));
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await searchByPolygons(polygons, {
        assumable: false,
        minPrice: 0,
        maxPrice: 10000000,
        limit: 100000
      });
      
      // Create a new search result
      const newSearch: SearchResult = {
        id: `polygon_${Date.now()}`,
        timestamp: new Date(),
        polygons: [...polygons],
        listings: data.listings,
        aggregations: data.aggregations
      };
      
      // Add to search history and set as active
      setSearchHistory(prev => [newSearch, ...prev]);
      setActiveSearchIndex(setSearchHistory.length - 1);
      
      return Promise.resolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return Promise.reject(err);
    } finally {
      setLoading(false)
    }
  }, []);

  // Handle active search change from SearchNavigator
  const handleActiveSearchChange = useCallback((index: number, searchResult: SearchResult) => {
    setActiveSearchIndex(index);
  }, []);

  // UI toggle functions
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'listings' ? 'dashboard' : 'listings');
    if (!isPanelOpen) {
      setIsPanelOpen(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle panel with 'S' key
      if (e.key === 's' || e.key === 'S') {
        togglePanel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePanel]);

  return (
    <Box position="relative" height="100vh" overflow="hidden">
      <Box 
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
      >
        <MapContainer
          searchResults={searchHistory}
          onSearchRegion={handleSearchRegion}
          activeSearchIndex={activeSearchIndex}
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
          <SearchNavigator 
            searchResults={searchHistory}
            onActiveSearchChange={handleActiveSearchChange}
            initialActiveIndex={0}
          />

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
              {listings.length > 0 ? 
                `${listings.length} Listings Found` : 
                "No Search Results Yet"
              }
            </Heading>
            {searchHistory[activeSearchIndex] && (
              <Text fontSize="sm" color="gray.600">
                {`Search performed on ${new Date(searchHistory[activeSearchIndex].timestamp).toLocaleString()}`}
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
