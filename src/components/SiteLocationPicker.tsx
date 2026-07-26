import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';

export type GateMapPoint = { latitude: number; longitude: number };
const DEFAULT_POINT: GateMapPoint = { latitude: 39.9334, longitude: 32.8597 };

function mapHtml(point: GateMapPoint, hasPoint: boolean) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#e9e6dd}body{overflow:hidden;font-family:Arial,sans-serif}.leaflet-control-attribution{font-size:9px!important}.leaflet-control-zoom a{color:#12263a!important}#loading{position:absolute;z-index:900;inset:0;display:flex;align-items:center;justify-content:center;background:#e9e6dd;color:#13273a;font-weight:700;font-size:13px}</style></head><body><div id="map"></div><div id="loading">Harita hazırlanıyor…</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>(function(){var started=false,map,marker;function send(p){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(p))}function setPoint(lat,lng,notify,center){if(!map||!isFinite(lat)||!isFinite(lng))return;if(!marker){marker=L.marker([lat,lng],{draggable:true,autoPan:true}).addTo(map);marker.on('dragend',function(){var p=marker.getLatLng();send({type:'point',latitude:p.lat,longitude:p.lng})})}else marker.setLatLng([lat,lng]);if(center||!map.getBounds().contains([lat,lng]))map.panTo([lat,lng],{animate:false});if(notify)send({type:'point',latitude:lat,longitude:lng})}window.dkdSetPoint=function(lat,lng){setPoint(Number(lat),Number(lng),false,false)};function start(){if(started)return;started=true;if(!window.L){send({type:'error',message:'Harita kitaplığı yüklenemedi. İnternet bağlantısını kontrol edin.'});return}map=L.map('map',{zoomControl:true,attributionControl:true,preferCanvas:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([${point.latitude},${point.longitude}],16);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:3,attribution:'&copy; OpenStreetMap katkıcıları'}).addTo(map);${hasPoint ? `setPoint(${point.latitude},${point.longitude},false,true);` : ''}map.on('click',function(e){setPoint(e.latlng.lat,e.latlng.lng,true,false)});map.whenReady(function(){var l=document.getElementById('loading');if(l)l.style.display='none';setTimeout(function(){map.invalidateSize(false)},100);send({type:'ready'})});map.on('tileerror',function(){send({type:'tileError',message:'Harita döşemeleri alınamadı.'})})}if(document.readyState==='complete')start();else window.addEventListener('load',start);setTimeout(function(){if(!started||!window.L)send({type:'error',message:'Harita bağlantısı zaman aşımına uğradı.'})},9000)})();</script></body></html>`;
}

export function SiteLocationPicker({ value, address, city, onChange }: { value?: GateMapPoint; address?: string; city?: string; onChange: (point: GateMapPoint) => void }) {
  const compactRef = useRef<WebView | null>(null);
  const fullRef = useRef<WebView | null>(null);
  const [query, setQuery] = useState([address, city].filter(Boolean).join(', '));
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapKey, setMapKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const point = value ?? DEFAULT_POINT;
  const html = useMemo(() => mapHtml(point, Boolean(value)), [mapKey]);

  useEffect(() => {
    if (!value) return;
    const command = `window.dkdSetPoint(${value.latitude}, ${value.longitude}); true;`;
    if (mapReady) compactRef.current?.injectJavaScript(command);
    if (expanded) fullRef.current?.injectJavaScript(command);
  }, [expanded, mapReady, value?.latitude, value?.longitude]);

  const setPoint = (next: GateMapPoint) => {
    onChange(next);
    const command = `window.dkdSetPoint(${next.latitude}, ${next.longitude}); true;`;
    compactRef.current?.injectJavaScript(command);
    fullRef.current?.injectJavaScript(command);
  };
  const onMapMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; latitude?: number; longitude?: number; message?: string };
      if (message.type === 'ready') { setMapReady(true); setMapError(''); }
      else if (message.type === 'point' && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) onChange({ latitude: Number(message.latitude), longitude: Number(message.longitude) });
      else if (message.type === 'error') setMapError(message.message || 'Harita yüklenemedi.');
      else if (message.type === 'tileError' && !mapReady) setMapError(message.message || 'Harita döşemeleri yüklenemedi.');
    } catch { /* only trusted map messages */ }
  };
  const retryMap = () => { setMapError(''); setMapReady(false); setMapKey((current) => current + 1); };
  const search = async () => {
    const text = query.trim() || [address, city].filter(Boolean).join(', ');
    if (!text) return Alert.alert('Adres gerekli', 'Site adını, adresini veya şehir bilgisini yaz.');
    setSearching(true);
    try { const result = await Location.geocodeAsync(text); const first = result[0]; if (!first) throw new Error('Adres bulunamadı. Daha açık bir adres yazarak tekrar dene.'); setPoint({ latitude: first.latitude, longitude: first.longitude }); }
    catch (error) { Alert.alert('Konum bulunamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setSearching(false); }
  };
  const useMyLocation = async () => {
    setSearching(true);
    try { const permission = await Location.requestForegroundPermissionsAsync(); if (!permission.granted) throw new Error('Konum izni verilmedi.'); const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); setPoint({ latitude: current.coords.latitude, longitude: current.coords.longitude }); }
    catch (error) { Alert.alert('Konum alınamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setSearching(false); }
  };
  const mapProps = { source: { html }, originWhitelist: ['*'] as string[], javaScriptEnabled: true, domStorageEnabled: true, mixedContentMode: 'never' as const, setSupportMultipleWindows: false, onMessage: onMapMessage, androidLayerType: 'hardware' as const };

  return <View style={styles.container}>
    <Text style={styles.label}>SİTE KONUMU</Text>
    <View style={styles.searchRow}><View style={styles.inputWrap}><Ionicons name="search" size={20} color={colors.cyan} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Site veya açık adres ara" placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} style={styles.input} /></View><AnimatedPressable onPress={() => void search()} disabled={searching}><View style={styles.searchButton}>{searching ? <ActivityIndicator color={colors.white} /> : <Ionicons name="navigate" size={21} color={colors.white} />}</View></AnimatedPressable></View>
    <View style={styles.mapFrame}><WebView key={`compact-${mapKey}`} ref={compactRef} style={styles.map} {...mapProps} onLoadStart={() => { setMapReady(false); setMapError(''); }} onError={() => setMapError('Harita görünümü açılamadı. İnternet bağlantısını kontrol edin.')} />{!mapReady && !mapError ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator size="large" color={colors.cyan} /><Text style={styles.loadingText}>Harita yükleniyor</Text></View> : null}{mapError ? <View style={styles.mapHelp}><Ionicons name="map-outline" size={28} color={colors.orange} /><Text style={styles.helpTitle}>Harita açılamadı</Text><Text style={styles.helpText}>{mapError}</Text><AnimatedPressable onPress={retryMap}><View style={styles.retry}><Ionicons name="refresh" size={17} color={colors.cyan} /><Text style={styles.retryText}>YENİDEN DENE</Text></View></AnimatedPressable></View> : null}<AnimatedPressable onPress={() => setExpanded(true)}><View style={styles.expand}><Ionicons name="expand" size={23} color={colors.white} /></View></AnimatedPressable><View pointerEvents="none" style={styles.mapHint}><Ionicons name="hand-left" size={16} color={colors.white} /><Text style={styles.mapHintText}>Haritaya dokun veya pini sürükle</Text></View></View>
    <Text style={styles.attribution}>Harita: OpenStreetMap katkıcıları • Konum yalnızca site ayarı için kullanılır.</Text>
    <View style={styles.footer}><AnimatedPressable onPress={() => void useMyLocation()} disabled={searching}><View style={styles.locationButton}><Ionicons name="locate" size={19} color={colors.green} /><Text style={styles.locationText}>KONUMUMU KULLAN</Text></View></AnimatedPressable><View style={styles.coordinateBox}><Text style={styles.coordinateLabel}>{value ? 'KONUM HAZIR' : 'KONUM BEKLENİYOR'}</Text><Text style={styles.coordinateText}>{value ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : 'Haritadan konum seç'}</Text></View></View>
    <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}><SafeAreaView style={styles.fullSafe} edges={['top', 'bottom', 'left', 'right']}><View style={styles.fullHeader}><View style={styles.fullTitleWrap}><Text style={styles.fullKicker}>SİTE KONUMU</Text><Text style={styles.fullTitle}>Haritayı Rahatça Gez</Text><Text style={styles.fullSub}>Yakınlaştır, uzaklaştır, haritayı sürükle ve doğru noktaya dokun.</Text></View><AnimatedPressable onPress={() => setExpanded(false)}><View style={styles.close}><Ionicons name="close" size={25} color={colors.white} /></View></AnimatedPressable></View><View style={styles.fullMap}><WebView key={`full-${mapKey}-${expanded ? 1 : 0}`} ref={fullRef} style={styles.map} {...mapProps} /></View><View style={styles.fullBottom}><View style={styles.fullCoordinate}><Text style={styles.coordinateLabel}>{value ? 'SEÇİLEN KONUM' : 'KONUM BEKLENİYOR'}</Text><Text style={styles.fullCoordinateText}>{value ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}` : 'Haritadan bir nokta seç'}</Text></View><AnimatedPressable onPress={() => setExpanded(false)}><View style={styles.useButton}><Ionicons name="checkmark-done" size={21} color={colors.background} /><Text style={styles.useButtonText}>BU KONUMU KULLAN</Text></View></AnimatedPressable></View></SafeAreaView></Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 9 }, label: { color: colors.textSoft, fontSize: 12, fontWeight: '900', letterSpacing: .6 }, searchRow: { flexDirection: 'row', gap: 8 }, inputWrap: { flex: 1, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,.035)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' }, searchButton: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.magenta },
  mapFrame: { height: 270, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden', backgroundColor: '#E9E6DD' }, map: { flex: 1, backgroundColor: '#E9E6DD' }, loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E6DD', gap: 8 }, loadingText: { color: '#14283A', fontSize: 11, fontWeight: '900' }, expand: { position: 'absolute', right: 11, top: 11, width: 50, height: 50, borderRadius: 17, backgroundColor: 'rgba(12,30,47,.90)', borderWidth: 1, borderColor: 'rgba(55,216,255,.72)', alignItems: 'center', justifyContent: 'center' }, mapHint: { position: 'absolute', left: 10, right: 10, bottom: 10, minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 12, backgroundColor: 'rgba(5,15,27,.84)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, mapHintText: { color: colors.white, fontSize: 11, fontWeight: '900' }, mapHelp: { position: 'absolute', left: 16, right: 16, top: 36, padding: 15, borderRadius: 18, backgroundColor: 'rgba(5,15,27,.95)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,179,92,.45)' }, helpTitle: { color: colors.text, fontWeight: '900', marginTop: 7 }, helpText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5 }, retry: { minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(55,216,255,.45)', backgroundColor: 'rgba(55,216,255,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, marginTop: 10 }, retryText: { color: colors.cyan, fontSize: 9, fontWeight: '900' }, attribution: { color: colors.textMuted, fontSize: 8.5, lineHeight: 13, textAlign: 'center' }, footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, locationButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(67,231,162,.38)', backgroundColor: 'rgba(67,231,162,.08)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 }, locationText: { color: colors.green, fontSize: 10, fontWeight: '900' }, coordinateBox: { flex: 1, alignItems: 'flex-end' }, coordinateLabel: { color: colors.cyan, fontSize: 9, fontWeight: '900' }, coordinateText: { color: colors.textSoft, fontSize: 10, marginTop: 3 },
  fullSafe: { flex: 1, backgroundColor: colors.background }, fullHeader: { minHeight: 105, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderStrong }, fullTitleWrap: { flex: 1 }, fullKicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, fullTitle: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 3 }, fullSub: { color: colors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 4 }, close: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,.06)', alignItems: 'center', justifyContent: 'center' }, fullMap: { flex: 1, margin: 12, borderRadius: 23, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.borderStrong }, fullBottom: { padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.borderStrong }, fullCoordinate: { alignItems: 'center' }, fullCoordinateText: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 4 }, useButton: { minHeight: 58, borderRadius: 19, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, useButtonText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
