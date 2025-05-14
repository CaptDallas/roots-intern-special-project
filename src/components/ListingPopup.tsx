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
      height="150px" 
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
      <Text color="gray.500">{message}</Text>
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
          height="140px" 
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
      anchor="bottom"
      offset={[0, -10]}
      onClose={onClose}
    >
      <Box p={0} maxW="300px">
        {/* Image Section */}
        {renderListingImage(listing, imageError, setImageError)}
        
        {/* Details Section */}
        <VStack align="start" gap={1} paddingTop={2}>
          <Text fontWeight="bold" fontSize="lg">
            ${listing?.price?.toLocaleString() || point.properties.price?.toLocaleString()}
          </Text>
          {(listing?.address || point.properties.address) && (
            <Text>{listing?.address || point.properties.address}</Text>
          )}
          <Text>
            {listing?.bedrooms && `${listing.bedrooms} beds`}
            {listing?.bathrooms && ` • ${listing.bathrooms} baths`}
            {listing?.squareFeet && ` • ${listing.squareFeet} sqft`}
          </Text>
          {(listing?.propertyType || point.properties.propertyType) && (
            <Text color="gray.500" fontSize="sm">
              {listing?.propertyType || point.properties.propertyType}
            </Text>
          )}
          {(listing?.status || point.properties.status) && (
            <Text color="blue.500" fontSize="sm">
              {listing?.status || point.properties.status}
            </Text>
          )}
          {(listing?.isAssumable || point.properties.isAssumable) && (
            <Text color="#CDFF64" fontSize="sm" fontWeight="bold">
              Assumable
            </Text>
          )}
        </VStack>
      </Box>
    </Popup>
  );
}