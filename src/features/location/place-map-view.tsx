import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { Coords } from '@/lib/location';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#141417' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0b0b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232429' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1118' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1b1c21' }] },
];

export function coordsToRegion(coords: Coords, delta = 0.012): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function regionToCoords(region: Region): Coords {
  return { lat: region.latitude, lng: region.longitude };
}

export type PlaceMapHandle = {
  animateToCoords: (coords: Coords, durationMs?: number) => void;
};

type PlaceMapViewProps = {
  initialCoords: Coords;
  markerCoords: Coords | null;
  onPressMap: (coords: Coords) => void;
  onDragMarkerEnd: (coords: Coords) => void;
  showsUserLocation?: boolean;
};

export const PlaceMapView = forwardRef<PlaceMapHandle, PlaceMapViewProps>(function PlaceMapView(
  { initialCoords, markerCoords, onPressMap, onDragMarkerEnd, showsUserLocation = true },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      animateToCoords: (coords: Coords, durationMs = 350): void => {
        mapRef.current?.animateToRegion(coordsToRegion(coords), durationMs);
      },
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={coordsToRegion(initialCoords)}
        onPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onPressMap({ lat: latitude, lng: longitude });
        }}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle="dark"
      >
        {markerCoords !== null ? (
          <PlaceMarker coords={markerCoords} onDragEnd={onDragMarkerEnd} />
        ) : null}
      </MapView>
    </View>
  );
});

type PlaceMarkerProps = {
  coords: Coords;
  onDragEnd: (coords: Coords) => void;
};

function PlaceMarker({ coords, onDragEnd }: PlaceMarkerProps) {
  // tracksViewChanges must be briefly true so the custom (glyph) marker renders,
  // then false to avoid the marker redrawing every frame while panning.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 600);
    return () => clearTimeout(timer);
  }, [coords.lat, coords.lng]);

  return (
    <Marker
      coordinate={{ latitude: coords.lat, longitude: coords.lng }}
      draggable
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
      onDragEnd={(event) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        onDragEnd({ lat: latitude, lng: longitude });
      }}
    >
      <View style={styles.marker}>
        <Ionicons name="location" size={44} color="#7488D8" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141417',
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
