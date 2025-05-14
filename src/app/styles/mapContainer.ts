// Styling for map containers and related elements

export const MAP_CONTAINER_STYLES = {
  // Main map container
  mapBox: {
    height: { 
      base: "500px", 
      lg: "calc(100vh - 150px)" 
    },
    borderRadius: "lg",
    overflow: "hidden"
  },
  
  // Listings container
  listingsContainer: {
    overflow: "auto",
    maxHeight: { 
      lg: "calc(100vh - 150px)" 
    },
    paddingRight: { 
      base: "0", 
      md: "6" 
    }
  },
  
  // Main layout grid
  mainGrid: {
    templateColumns: { 
      base: "1fr", 
      lg: "1fr 1fr" 
    },
    gap: "6"
  },
  
  // Map container grid item
  mapGridItem: {
    position: "sticky",
    top: "0"
  }
}; 