
export const MAP_CONTAINER_STYLES = {
  mapBox: {
    height: { 
      base: "500px", 
      lg: "calc(100vh - 150px)" 
    },
    borderRadius: "lg",
    overflow: "hidden"
  },
  
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
  
  mainGrid: {
    templateColumns: { 
      base: "1fr", 
      lg: "1fr 1fr" 
    },
    gap: "6"
  },
  
  mapGridItem: {
    position: "sticky",
    top: "0"
  }
}; 