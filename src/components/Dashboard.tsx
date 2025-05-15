'use client';

import React, { useMemo } from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Heading, 
  SimpleGrid,
  Flex, 
  BoxProps,
  Button,
  HStack,
} from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS } from '@/app/styles/theme';
import { SearchResult } from '@/types';

interface DashboardProps {
  searchHistory: SearchResult[];
  activeSearchIndex: number;
}

const StatCard = ({ title, value, subtitle, ...props }: {
  title: string;
  value: string | number;
  subtitle: string;
} & BoxProps) => (
  <Box p={5} bg={COLORS.brand.green} borderRadius="lg" boxShadow="md" {...props}>
    <Flex direction="column" alignItems="flex-start">
      <Text fontSize="md" fontWeight="medium" color="gray.700" mb={1}>{title}</Text>
      <Text fontSize="2xl" fontWeight="bold" mb={1}>{value}</Text>
      <Text fontSize="xs" color="gray.600">{subtitle}</Text>
    </Flex>
  </Box>
);

export default function Dashboard({ 
  searchHistory, 
  activeSearchIndex,
}: DashboardProps) {
  // Get the active search and its listings
  const activeSearch = searchHistory[activeSearchIndex];
  const listings = activeSearch?.listings || [];
  const aggregations = activeSearch?.aggregations;
  
  // Calculate dashboard metrics (use aggregations if available)
  const assumableListings = listings.filter(listing => listing.isAssumable);
  const assumableCount = aggregations?.assumableListings ?? assumableListings.length;
  const totalListings = aggregations?.totalListings ?? listings.length;
  
  const avgPrice = aggregations?.avgPrice ?? (listings.length 
    ? listings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / listings.length 
    : 0);
    
  const avgAssumablePrice = aggregations?.avgAssumablePrice ?? (assumableListings.length 
    ? assumableListings.reduce((sum, listing) => sum + (typeof listing.price === 'number' ? listing.price : 0), 0) / assumableListings.length 
    : 0);
  
  // Calculate median interest rate for assumable properties
  const medianInterestRate = aggregations?.medianLoanRate ?? (() => {
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
  
  // Create data for the interest rate histogram
  const interestRateHistogramData = useMemo(() => {
    if (!assumableListings.length) return [];
    
    // Get all interest rates
    const rates = assumableListings
      .map(listing => listing.denormalizedAssumableInterestRate)
      .filter(rate => rate !== undefined && rate !== null);
    
    if (!rates.length) return [];
    
    // Define buckets for the histogram (from 2.0% to 8.0% in 0.5% increments)
    const bucketSize = 0.5;
    const minRate = 2.0;
    const maxRate = 8.0;
    const buckets: { range: string; count: number; rate: number }[] = [];
    
    // Create empty buckets
    for (let rate = minRate; rate <= maxRate; rate += bucketSize) {
      buckets.push({
        range: `${rate.toFixed(1)}%`,
        count: 0,
        rate: rate
      });
    }
    
    // Count rates in each bucket
    rates.forEach(rate => {
      if (rate < minRate || rate > maxRate) return; // Skip outliers
      
      const bucketIndex = Math.floor((rate - minRate) / bucketSize);
      if (bucketIndex >= 0 && bucketIndex < buckets.length) {
        buckets[bucketIndex].count++;
      }
    });
    
    // Filter out empty buckets and return
    return buckets.filter(bucket => bucket.count > 0);
  }, [assumableListings]);
    
  // Get property types distribution
  const propertyTypes = aggregations?.propertyTypes ?? listings.reduce((acc, listing) => {
    const type = listing.propertyType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <VStack gap={8} align="stretch" h="100%">
      <Box>
        <Heading size="lg" mb={3}>Dashboard</Heading>
        {activeSearch && activeSearch.polygons.length > 0 && (
          <VStack align="stretch" mb={4} gap={3}>
            <Text fontSize="md" color="gray.600">
              {activeSearch.polygons.length} {activeSearch.polygons.length === 1 ? 'region' : 'regions'} searched
              • {totalListings} listings found
            </Text>
          </VStack>
        )}
      </Box>
      
      {/* Key Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
        <StatCard 
          title="Median Interest Rate" 
          value={Number.isNaN(medianInterestRate) ? 'N/A' : `${medianInterestRate.toFixed(2)}%`} 
          subtitle="Assumable listings"
        />
        
        <StatCard 
          title="Assumable Listings" 
          value={assumableCount} 
          subtitle={`${Math.round((assumableCount / (totalListings || 1)) * 100) || 0}% of inventory`}
        />
        
        <StatCard 
          title="Average Price" 
          value={`$${Math.round(avgPrice).toLocaleString()}`} 
          subtitle="All listings"
        />
      </SimpleGrid>
      
      {/* Interest Rate Histogram */}
      {assumableListings.length > 0 && (
        <Box p={5} bg="white" borderRadius="lg" boxShadow="md">
          <Heading size="md" mb={5}>Interest Rate Distribution</Heading>
          <Box height="220px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={interestRateHistogramData}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: 'Listings Count', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: '12px' } 
                  }}
                />
                <Tooltip 
                  formatter={(value) => [`${value} listings`, 'Count']}
                  labelFormatter={(label) => `Interest Rate: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill={COLORS.brand.green} 
                  name="Listings"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
      
      {/* Property Types */}
      <Box p={5} bg="white" borderRadius="lg" boxShadow="md">
        <Heading size="md" mb={5}>Property Types</Heading>
        <SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
          {Object.entries(propertyTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <Flex key={type} justifyContent="space-between" p={3} borderRadius="md" bg="gray.50">
              <Text fontWeight="medium">{type}</Text>
              <Text fontWeight="bold">{count}</Text>
            </Flex>
          ))}
        </SimpleGrid>
      </Box>
      
      {/* Assumable Listings Stats */}
      <Box p={5} bg="white" borderRadius="lg" boxShadow="md">
        <Heading size="md" mb={5}>Assumable Listings</Heading>
        {assumableCount > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            <Box>
              <Text fontSize="md" fontWeight="medium" color="gray.700">Average Price</Text>
              <Text fontSize="2xl" fontWeight="bold">${Math.round(avgAssumablePrice).toLocaleString()}</Text>
              <Text fontSize="xs" color="gray.600">Assumable only</Text>
            </Box>
            <Box>
              <Text fontSize="md" fontWeight="medium" color="gray.700">Price Difference</Text>
              <Text fontSize="2xl" fontWeight="bold">
                {avgAssumablePrice > avgPrice 
                  ? `+$${Math.round(avgAssumablePrice - avgPrice).toLocaleString()}`
                  : `-$${Math.round(avgPrice - avgAssumablePrice).toLocaleString()}`}
              </Text>
              <Text fontSize="xs" color="gray.600">Compared to average</Text>
            </Box>
          </SimpleGrid>
        ) : (
          <Text color="gray.500">No assumable listings available</Text>
        )}
      </Box>
    </VStack>
  );
}
