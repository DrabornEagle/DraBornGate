import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';

export type GateMapPoint = { latitude: number; longitude: number };

const defaultRegion: Region = {
  latitude: 39.9334,
  longitude: 32.8597,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export function SiteLocationPicker({
  value,
  address,
  city,
  onChange,
}: {
  value?: GateMapPoint;
  address?: string;
  city?: string;
  onChange: (point: GateMapPoint) => void;
}) {
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState([address, city].filter(Boolean).join(', '));
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!value) return;
    mapRef.current?.animateToRegion({ ...value, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 450);
  }, [value?.latitude, value?.longitude]);

  useEffect(() => {
    if (!query.trim() && (address || city)) setQuery([address, city].filter(Boolean).join(', '));
  }, [address, city, query]);

  const setPoint = (point: GateMapPoint) => {
    onChange(point);
    mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 350);
  };

  const search = async () => {
    const text = query.trim() || [address, city].filter(Boolean).join(', ');
    if (!text) return Alert.alert('Adres gerekli', 'Site adını, adresini veya şehir bilgisini yaz.');
    setSearching(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Haritada adres aramak için konum izni gerekli.');
      const result = await Location.geocodeAsync(text);
      const first = result[0];
      if (!first) throw new Error('Adres bulunamadı. Daha açık bir adres yazarak tekrar dene.');
      setPoint({ latitude: first.latitude, longitude: first.longitude });
    } catch (error) {
      Alert.alert('Konum bulunamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = async () => {
    setSearching(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Konum izni verilmedi.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (error) {
      Alert.alert('Konum alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setSearching(false);
    }
  };

  const pressMap = (event: MapPressEvent) => setPoint(event.nativeEvent.coordinate);
  const region = value ? { ...value, latitudeDelta: 0.018, longitudeDelta: 0.018 } : defaultRegion;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SİTE KONUMU</Text>
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={20} color={colors.cyan} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void search()}
            placeholder="Site veya açık adres ara"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.cyan}
            style={styles.input}
          />
        </View>
        <AnimatedPressable onPress={() => void search()} disabled={searching}>
          <View style={styles.searchButton}><Ionicons name="navigate" size={21} color={colors.white} /></View>
        </AnimatedPressable>
      </View>

      <View style={styles.mapFrame}>
        <MapView ref={mapRef} style={styles.map} initialRegion={region} onPress={pressMap}>
          {value ? (
            <Marker
              coordinate={value}
              draggable
              title="Site konumu"
              description="Pini sürükleyerek hassas konumu ayarla"
              onDragEnd={(event) => setPoint(event.nativeEvent.coordinate)}
              pinColor={colors.magenta}
            />
          ) : null}
        </MapView>
        <View pointerEvents="none" style={styles.mapHint}>
          <Ionicons name="hand-left" size={16} color={colors.white} />
          <Text style={styles.mapHintText}>Haritaya dokun veya pini sürükle</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <AnimatedPressable onPress={() => void useMyLocation()} disabled={searching}>
          <View style={styles.locationButton}>
            <Ionicons name="locate" size={19} color={colors.green} />
            <Text style={styles.locationText}>KONUMUMU KULLAN</Text>
          </View>
        </AnimatedPressable>
        <View style={styles.coordinateBox}>
          <Text style={styles.coordinateLabel}>{value ? 'PIN HAZIR' : 'PIN BEKLENİYOR'}</Text>
          <Text style={styles.coordinateText}>{value ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : 'Haritadan konum seç'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: '900', letterSpacing: .6 },
  searchRow: { flexDirection: 'row', gap: 8 },
  inputWrap: { flex: 1, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,.035)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  searchButton: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.magenta },
  mapFrame: { height: 245, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden', backgroundColor: colors.panel },
  map: { flex: 1 },
  mapHint: { position: 'absolute', left: 10, right: 10, bottom: 10, minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 12, backgroundColor: 'rgba(5,15,27,.84)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  mapHintText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  locationButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(67,231,162,.38)', backgroundColor: 'rgba(67,231,162,.08)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationText: { color: colors.green, fontSize: 10, fontWeight: '900' },
  coordinateBox: { flex: 1, alignItems: 'flex-end' },
  coordinateLabel: { color: colors.cyan, fontSize: 9, fontWeight: '900' },
  coordinateText: { color: colors.textSoft, fontSize: 10, marginTop: 3 },
});
