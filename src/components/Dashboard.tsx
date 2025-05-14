'use client';

import React from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Heading, 
  SimpleGrid,
  Flex, 
  Icon,
  BoxProps,
  Button,
  HStack,
} from "@chakra-ui/react";
import { COLORS } from '@/app/styles/theme';
import { SearchResult } from '@/types';

interface DashboardProps {
  searchHistory: SearchResult[];
  activeSearchIndex: number;
  onNextSearch: () => void;
  onPreviousSearch: () => void;
  showHistoricalPolygons?: boolean;
  onToggleHistoricalPolygons?: () => void;
}

const StatCard = ({ title, value, subtitle, ...props }: {
  title: string;
  value: string | number;
  subtitle: string;
} & BoxProps) => (
  <Box p={4} bg={COLORS.brand.green} borderRadius="lg" boxShadow="sm" {...props}>
    <Flex justifyContent="space-between">
      <Box>
        <Text fontSize="sm" color="gray.500">{title}</Text>
        <Text fontSize="2xl" fontWeight="bold">{value}</Text>
        <Text fontSize="xs" color="gray.500">{subtitle}</Text>
      </Box>
    </Flex>
  </Box>
);

export default function Dashboard({ 
  searchHistory, 
  activeSearchIndex, 
  onNextSearch, 
  onPreviousSearch,
  showHistoricalPolygons = false,
  onToggleHistoricalPolygons
}: DashboardProps) {
  // Get the active search and its listings
  const activeSearch = searchHistory[activeSearchIndex];
  const listings = activeSearch?.listings || [];
  
  // Calculate dashboard metrics
  const assumableListings = listings.filter(listing => listing.isAssumable);
  const avgPrice = listings.length 
    ? listings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / listings.length 
    : 0;
  const avgAssumablePrice = assumableListings.length 
    ? assumableListings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / assumableListings.length 
    : 0;
  
  // Calculate median interest rate for assumable properties
  const medianInterestRate = (() => {
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
    
  // Get property types distribution
  const propertyTypes: Record<string, number> = listings.reduce((acc, listing) => {
    const type = listing.propertyType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Get active search information
  const hasMultipleSearches = searchHistory.length > 1;
  
  return (
    <VStack gap={6} align="stretch" h="100%">
      <Box>
        <Heading size="lg" mb={2}>Dashboard</Heading>
        {hasMultipleSearches && (
          <HStack justifyContent="space-between" mb={4}>
            <Text fontSize="sm" color="gray.600">
              Search {activeSearchIndex + 1} of {searchHistory.length}
              {activeSearch && ` • ${new Date(activeSearch.timestamp).toLocaleString()}`}
            </Text>
            <HStack gap={2}>
              <Button 
                size="sm" 
                onClick={onPreviousSearch} 
                disabled={activeSearchIndex >= searchHistory.length - 1}
              >
                Older
              </Button>
              <Button 
                size="sm" 
                onClick={onNextSearch} 
                disabled={activeSearchIndex <= 0}
              >
                Newer
              </Button>
            </HStack>
          </HStack>
        )}
        {activeSearch && activeSearch.polygons.length > 0 && (
          <VStack align="stretch" mb={4} gap={2}>
            <Text fontSize="sm" color="gray.600">
              {activeSearch.polygons.length} {activeSearch.polygons.length === 1 ? 'region' : 'regions'} searched
              • {listings.length} listings found
            </Text>
            {onToggleHistoricalPolygons && (
              <Button 
                size="xs" 
                variant={showHistoricalPolygons ? "solid" : "outline"}
                colorScheme="teal" 
                onClick={onToggleHistoricalPolygons}
                alignSelf="flex-start"
              >
                {showHistoricalPolygons ? "Hide Region on Map" : "Show Region on Map"}
              </Button>
            )}
          </VStack>
        )}
      </Box>
      
      {/* Key Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <StatCard 
          title="Median Interest Rate" 
          value={Number.isNaN(medianInterestRate) ? 'N/A' : `${medianInterestRate.toFixed(2)}%`} 
          subtitle="Assumable listings"
        />
        
        <StatCard 
          title="Assumable Listings" 
          value={assumableListings.length} 
          subtitle={`${Math.round((assumableListings.length / (listings.length || 1)) * 100) || 0}% of inventory`}
        />
        
        <StatCard 
          title="Average Price" 
          value={`$${Math.round(avgPrice).toLocaleString()}`} 
          subtitle="All listings"
        />
      </SimpleGrid>
      
      {/* Property Types */}
      <Box p={4} bg="white" borderRadius="lg" boxShadow="sm">
        <Heading size="md" mb={4}>Property Types</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {Object.entries(propertyTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <Flex key={type} justifyContent="space-between" p={2} borderBottom="1px" borderColor="gray.100">
              <Text>{type}</Text>
              <Text fontWeight="bold">{count}</Text>
            </Flex>
          ))}
        </SimpleGrid>
      </Box>
      
      {/* Assumable Listings Stats */}
      <Box p={4} bg="white" borderRadius="lg" boxShadow="sm">
        <Heading size="md" mb={4}>Assumable Listings</Heading>
        {assumableListings.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.500">Average Price</Text>
              <Text fontSize="2xl" fontWeight="bold">${Math.round(avgAssumablePrice).toLocaleString()}</Text>
              <Text fontSize="xs" color="gray.500">Assumable only</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">Price Difference</Text>
              <Text fontSize="2xl" fontWeight="bold">
                {avgAssumablePrice > avgPrice 
                  ? `+$${Math.round(avgAssumablePrice - avgPrice).toLocaleString()}`
                  : `-$${Math.round(avgPrice - avgAssumablePrice).toLocaleString()}`}
              </Text>
              <Text fontSize="xs" color="gray.500">Compared to average</Text>
            </Box>
          </SimpleGrid>
        ) : (
          <Text color="gray.500">No assumable listings available</Text>
        )}
      </Box>
    </VStack>
  );
}
