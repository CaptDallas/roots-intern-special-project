'use client';

import React, { useState } from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { Box, Text, VStack, Image } from '@chakra-ui/react';
import { Listing } from '@/types/listing';

export type HoveredPoint = {
  longitude: number;
  latitude: number;
  properties: any;
  originalListing?: Listing;
} | null;

interface ListingPopupProps {
  point: HoveredPoint;
  onClose: () => void;
}

function renderImageFallback(message: string) {
  return (
    <Box 
      height="120px" 
      width="100%"
      bg="gray.200" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      borderTopLeftRadius="md"
      borderTopRightRadius="md"
      margin="0"
      padding="0"
      border="none"
    >
      <Text color="gray.500" fontSize="xs">{message}</Text>
    </Box>
  );
}

function renderListingImage(
  listing?: Listing, 
  imageError: boolean = false, 
  setImageError?: (error: boolean) => void
) {
  if (listing?.photoUrls && Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0) {
    if (!imageError) {
      return (
        <Box 
          width="100%" 
          height="120px" 
          padding="0" 
          margin="0"
          overflow="hidden"
          borderTopLeftRadius="md"
          borderTopRightRadius="md"
          border="none"
        >
          <Image
            src={listing.photoUrls[0]}
            alt={listing.address || 'Property'}
            height="100%"
            width="100%"
            objectFit="cover"
            borderRadius="0"
            border="none"
            onError={() => setImageError?.(true)}
          />
        </Box>
      );
    } else {
      return renderImageFallback("Image Failed to Load");
    }
  } else {
    return renderImageFallback("No Image Available");
  }
}

const popupOffsets = {
  top:    [ 0,  10] as [number, number],
  bottom: [ 0, -10] as [number, number],
  left:   [ 10,  0] as [number, number],
  right:  [-10,  0] as [number, number],
  "top-left":    [10, 10] as [number, number],
  "top-right":   [-10, 10] as [number, number],
  "bottom-left": [10, -10] as [number, number],
  "bottom-right":[-10,-10] as [number, number],
};

export function ListingPopup({ point, onClose }: ListingPopupProps) {
  const [imageError, setImageError] = useState(false);
  const listing = point?.originalListing;

  if (!point) return null;

  return (
    <Popup
      longitude={point.longitude}
      latitude={point.latitude}
      closeButton={false}
      closeOnClick={false}
      offset={popupOffsets}
      onClose={onClose}
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
        border: 'none'
      }}
    >
      <Box p={0} maxW="240px" borderRadius="md" border="none">
        {/* Image Section */}
        {renderListingImage(listing, imageError, setImageError)}
        
        {/* Details Section */}
        <VStack align="start" gap={1} p={2} pt={1.5}>
          <Text fontWeight="bold" fontSize="md">
            ${listing?.price?.toLocaleString() || point.properties.price?.toLocaleString()}
          </Text>
          {(listing?.address || point.properties.address) && (
            <Text 
              fontSize="sm" 
              maxWidth="100%"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {listing?.address || point.properties.address}
            </Text>
          )}
          <Text fontSize="xs">
            {listing?.bedrooms && `${listing.bedrooms} beds`}
            {listing?.bathrooms && ` • ${listing.bathrooms} baths`}
            {listing?.squareFeet && ` • ${listing.squareFeet} sqft`}
          </Text>
          {(listing?.propertyType || point.properties.propertyType) && (
            <Text color="gray.500" fontSize="2xs">
              {listing?.propertyType || point.properties.propertyType}
            </Text>
          )}
          {(listing?.status || point.properties.status) && (
            <Text color="blue.500" fontSize="2xs">
              {listing?.status || point.properties.status}
            </Text>
          )}
          {(listing?.isAssumable || point.properties.isAssumable) && (
            <Text color="#CDFF64" fontSize="2xs" fontWeight="bold">
              Assumable
            </Text>
          )}
        </VStack>
      </Box>
    </Popup>
  );
}