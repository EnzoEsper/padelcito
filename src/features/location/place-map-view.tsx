import { Platform, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
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

type PlaceMapViewProps = {
  region: Region;
  onRegionChangeComplete: (region: Region) => void;
  showsUserLocation?: boolean;
};

export function PlaceMapView({
  region,
  onRegionChangeComplete,
  showsUserLocation = true,
}: PlaceMapViewProps) {
  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle="dark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141417',
  },
});
