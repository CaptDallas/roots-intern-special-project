'use client';

import React, { useState, useCallback } from 'react';
import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { SHADOWS } from '@/app/styles/theme';
import { SearchResult } from '@/types';

const BUTTON_SHADOW = SHADOWS.md;

interface SearchNavigatorProps {
  searchResults: SearchResult[];
  onActiveSearchChange?: (index: number, searchResult: SearchResult) => void;
  initialActiveIndex?: number;
}

/**
 * SearchNavigator Component
 * 
 * Provides a navigation interface for changing the active search result.
 * 
 * Features:
 * - Displays current search position (e.g., "3/5")
 * - Provides "Newer" and "Older" buttons for navigation
 * - Maintains local active index state
 * - Automatically hides when there's only one or zero search results
 * 
 * @param {SearchResult[]} searchResults - Array of search results to reference for length
 * @param {Function} onActiveSearchChange - Callback when the active search changes
 * @param {number} initialActiveIndex - Initial active index (defaults to 0)
 * 
 * @returns {JSX.Element|null} Navigation UI or null if there's only one or zero search results
 */
export default function SearchNavigator({
  searchResults,
  onActiveSearchChange,
  initialActiveIndex = 0
}: SearchNavigatorProps) {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  
  const handleNext = useCallback(() => {
    if (activeIndex > 0) {
      const newIndex = activeIndex - 1;
      setActiveIndex(newIndex);
      onActiveSearchChange?.(newIndex, searchResults[newIndex]);
    }
  }, [activeIndex, searchResults, onActiveSearchChange]);
  
  const handlePrevious = useCallback(() => {
    if (activeIndex < searchResults.length - 1) {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
      onActiveSearchChange?.(newIndex, searchResults[newIndex]);
    }
  }, [activeIndex, searchResults.length, searchResults, onActiveSearchChange]);
  
  if (searchResults.length <= 1) {
    return null;
  }

  return (
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
          onClick={handlePrevious}
          disabled={activeIndex >= searchResults.length - 1}
        >
          ← Older
        </Button>
        
        <Text fontSize="sm" fontWeight="medium" mx={1}>
          {activeIndex + 1}/{searchResults.length}
        </Text>
        
        <Button 
          size="sm"
          colorScheme="blue"
          onClick={handleNext}
          disabled={activeIndex <= 0}
        >
          Newer →
        </Button>
      </HStack>
    </Box>
  );
} 