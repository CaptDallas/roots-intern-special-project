'use client';  // Next 13+ App Router; omit for pages/

import { useState } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import ReactMapGL from 'react-map-gl/mapbox';
import { Marker } from 'react-map-gl/mapbox';

type Point = { latitude: number; longitude: number };

interface MapWithMarkersProps {
  markers: Point[];
}

export default function MapWithMarkers({ markers }: MapWithMarkersProps) {
  return (
    <ReactMapGL
        initialViewState={{ //init to first marker
        longitude: markers[0]?.longitude ?? -122.4,
        latitude: markers[0]?.latitude ?? 37.8,
        zoom: 12
         }}
        style={{ width: '100%', height: '400px' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_SECRET_KEY}
        attributionControl={false}
    >
        {markers.map((point, index) => (
            <Marker
                key={index}
                longitude={point.longitude}
                latitude={point.latitude}
                anchor="bottom"
            >
                <div
                    style={{
                        width: 12,
                        height: 12,
                        backgroundColor: 'red',
                        borderRadius: '100%',
                        transform: 'translate(-6px, -6px)',
                    }}
                />
            </Marker>
        ))}
    </ReactMapGL>
  );
}
