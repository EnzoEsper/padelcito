import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Text } from '@/tw';

const C = {
  blue: '#3A4A86',
  blueMid: '#7C8FE8',
  mist: '#E4E4E4',
  ink: '#0B0B0B',
} as const;

type MapClusterMarkerProps = {
  clusterId: number;
  latitude: number;
  longitude: number;
  count: number;
  onPress: () => void;
};

export function MapClusterMarker({
  clusterId,
  latitude,
  longitude,
  count,
  onPress,
}: MapClusterMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const size = count >= 10 ? 46 : 40;

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 600);
    return () => clearTimeout(timer);
  }, [latitude, longitude, count]);

  return (
    <Marker
      identifier={`cluster-${clusterId}`}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={styles.count}>{count}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.45,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  count: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: C.mist,
    letterSpacing: 0.3,
  },
});
