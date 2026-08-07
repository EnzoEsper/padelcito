import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/tw';
import {
  categoryAccentLevel,
  type CategoryAccentLevel,
} from '@/features/matches/match-display';
import type { Coords } from '@/lib/location';

const C = {
  blueHi: '#7C8FE8',
  blueMid: '#5E70B8',
  slate: '#6B76A0',
  mist: '#E4E4E4',
  ink: '#0B0B0B',
} as const;

/** Bright, map-legible fill per category tier (never darker than a visible slate). */
function fillForLevel(level: CategoryAccentLevel): string {
  if (level === 'high') return C.blueHi;
  if (level === 'mid') return C.blueMid;
  return C.slate;
}

type MapMatchMarkerProps = {
  matchId: string;
  coords: Coords;
  categoryMax: number;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function MapMatchMarker({
  matchId,
  coords,
  categoryMax,
  label,
  selected,
  onPress,
}: MapMatchMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const fill = fillForLevel(categoryAccentLevel(categoryMax));

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 600);
    return () => clearTimeout(timer);
  }, [coords.lat, coords.lng, selected, categoryMax, label]);

  return (
    <Marker
      identifier={matchId}
      coordinate={{ latitude: coords.lat, longitude: coords.lng }}
      tracksViewChanges={tracksViewChanges}
      anchor={selected ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
      zIndex={selected ? 999 : 1}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
    >
      {selected ? (
        <View style={styles.selectedWrap}>
          <View style={[styles.pill, { backgroundColor: fill }]}>
            <Ionicons name="tennisball" size={13} color={C.mist} />
            <Text style={styles.pillText}>{label}</Text>
          </View>
          <View style={[styles.pillTail, { borderTopColor: fill }]} />
        </View>
      ) : (
        <View style={styles.dotWrap}>
          <View style={[styles.dot, { backgroundColor: fill }]}>
            <Ionicons name="tennisball" size={13} color={C.mist} />
          </View>
        </View>
      )}
    </Marker>
  );
}

const styles = StyleSheet.create({
  dotWrap: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: C.mist,
    shadowColor: C.ink,
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  selectedWrap: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 9,
    paddingRight: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.mist,
    shadowColor: C.ink,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  pillText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: C.mist,
  },
  pillTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
