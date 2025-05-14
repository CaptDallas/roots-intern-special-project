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
  BoxProps
} from "@chakra-ui/react";
import { Listing } from '@/types/listing';
const BRAND_GREEN = '#CDFF64';

interface DashboardProps {
  listings: Listing[];
}

const StatCard = ({ title, value, subtitle, ...props }: {
  title: string;
  value: string | number;
  subtitle: string;
} & BoxProps) => (
  <Box p={4} bg={BRAND_GREEN} borderRadius="lg" boxShadow="sm" {...props}>
    <Flex justifyContent="space-between">
      <Box>
        <Text fontSize="sm" color="gray.500">{title}</Text>
        <Text fontSize="2xl" fontWeight="bold">{value}</Text>
        <Text fontSize="xs" color="gray.500">{subtitle}</Text>
      </Box>
    </Flex>
  </Box>
);

export default function Dashboard({ listings }: DashboardProps) {
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
    
  console.log('Assumable listings:', assumableListings.length, 'Median interest rate:', medianInterestRate);
  
  // Get property types distribution
  const propertyTypes = listings.reduce((acc, listing) => {
    const type = listing.propertyType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <VStack gap={6} align="stretch" h="100%">
      <Heading size="lg" mb={2}>Dashboard</Heading>
      
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
          subtitle={`${Math.round((assumableListings.length / listings.length) * 100) || 0}% of inventory`}
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
