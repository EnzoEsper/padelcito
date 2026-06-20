import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text } from '@/tw';
import {
  SEARCH_RADIUS_MAX_KM,
  SEARCH_RADIUS_MIN_KM,
  clampSearchRadiusKm,
  clampSearchRadiusRatio,
  radiusKmFromRatio,
  ratioFromRadiusKm,
} from '@/features/discover/search-radius';

const C = {
  surface3: '#232429',
  blue: '#2B396D',
  blueMid: '#5E70B8',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
} as const;

const THUMB_SIZE = 22;

type SearchRadiusSliderProps = {
  radiusKm: number;
  onRadiusCommit: (radiusKm: number) => void;
};

export function SearchRadiusSlider({ radiusKm, onRadiusCommit }: SearchRadiusSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const dragStartRatioRef = useRef(0);
  const radiusKmRef = useRef(radiusKm);
  const draftRatioRef = useRef<number | null>(null);
  const [draftRatio, setDraftRatio] = useState<number | null>(null);

  radiusKmRef.current = radiusKm;
  draftRatioRef.current = draftRatio;

  const displayRatio = draftRatio ?? ratioFromRadiusKm(radiusKm);
  const displayRadiusKm = clampSearchRadiusKm(radiusKmFromRatio(displayRatio));
  const fillWidth = trackWidth * displayRatio;
  const thumbLeft = trackWidth * displayRatio - THUMB_SIZE / 2;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;

          const currentRatio =
            draftRatioRef.current ?? ratioFromRadiusKm(radiusKmRef.current);
          const tapRatio = clampSearchRadiusRatio(event.nativeEvent.locationX / width);
          const thumbCenterPx = currentRatio * width;
          const tappedAwayFromThumb =
            Math.abs(event.nativeEvent.locationX - thumbCenterPx) > THUMB_SIZE;

          const startRatio = tappedAwayFromThumb ? tapRatio : currentRatio;
          dragStartRatioRef.current = startRatio;
          draftRatioRef.current = startRatio;
          setDraftRatio(startRatio);
        },
        onPanResponderMove: (_, gestureState) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;

          const nextRatio = clampSearchRadiusRatio(
            dragStartRatioRef.current + gestureState.dx / width,
          );
          draftRatioRef.current = nextRatio;
          setDraftRatio(nextRatio);
        },
        onPanResponderRelease: () => {
          const currentRatio = draftRatioRef.current;
          if (currentRatio !== null) {
            onRadiusCommit(clampSearchRadiusKm(radiusKmFromRatio(currentRatio)));
          }
          draftRatioRef.current = null;
          setDraftRatio(null);
        },
        onPanResponderTerminate: () => {
          draftRatioRef.current = null;
          setDraftRatio(null);
        },
      }),
    [onRadiusCommit],
  );

  return (
    <View style={styles.radiusCard}>
      <View style={styles.radiusHeader}>
        <View style={styles.inline}>
          <Ionicons name="location-outline" size={15} color={C.blueHi} />
          <Text style={styles.radiusLabel}>Search Radius</Text>
        </View>
        <View style={styles.inlineBaseline}>
          <Text style={styles.radiusValue}>{displayRadiusKm.toFixed(1)}</Text>
          <Text style={styles.radiusUnit}>KM</Text>
        </View>
      </View>

      <View
        style={styles.sliderTrack}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          trackWidthRef.current = width;
          setTrackWidth(width);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Search radius"
        accessibilityValue={{
          min: SEARCH_RADIUS_MIN_KM,
          max: SEARCH_RADIUS_MAX_KM,
          now: displayRadiusKm,
          text: `${displayRadiusKm} kilometers`,
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderHalo} />
        <View style={styles.sliderRail} />
        <LinearGradient
          colors={[C.blue, C.blueMid, C.blueHi]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.sliderFill, { width: fillWidth }]}
        />
        <View style={[styles.sliderThumb, { left: thumbLeft }]} />
      </View>

      <View style={styles.sliderBounds}>
        <Text style={styles.sliderBoundText}>{SEARCH_RADIUS_MIN_KM} KM</Text>
        <Text style={styles.sliderBoundText}>{SEARCH_RADIUS_MAX_KM} KM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  radiusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineBaseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  radiusLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11.5,
    letterSpacing: 2,
    color: C.label,
    textTransform: 'uppercase',
  },
  radiusValue: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 17,
    color: C.mist,
  },
  radiusUnit: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    letterSpacing: 1,
    color: C.dim,
  },
  sliderTrack: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderHalo: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(116,136,216,0.055)',
    shadowColor: C.blueHi,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 2,
  },
  sliderRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surface3,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: C.mist,
    borderWidth: 4,
    borderColor: 'rgba(116,136,216,0.22)',
  },
  sliderBounds: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderBoundText: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
});
