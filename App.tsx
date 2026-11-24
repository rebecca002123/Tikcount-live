import TikCountWidget from "./TikCountWidget";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let milestoneQueue = Promise.resolve();

function checkMilestone(id: string, views: number) {
  milestoneQueue = milestoneQueue.then(async () => {
    const key = "milestone:" + id;
    const saved = await AsyncStorage.getItem(key);
    const current = Math.floor(views / 500000);
    if (saved === null) {
      await AsyncStorage.setItem(key, String(current));
      return;
    }
    if (current > Number(saved)) {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 " + (current * 0.5) + "M views!",
          body: "Your TikTok video has reached " +
            (current * 500000).toLocaleString("en-GB") +
            " views!",
          sound: true,
        },
        trigger: null,
      });
      await AsyncStorage.setItem(key, String(current));
    }
  }).catch(console.warn);
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Keyboard, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View
} from "react-native";
import { fetchVideoStats } from "./src/api";
import { extractVideoId } from "./src/tiktok";
import type { VideoStats } from "./src/types";

const DEFAULT_ID = "7709304600095984929";
const REFRESH_MS = 5000;

const format = (n: number) => Math.floor(n).toLocaleString("en-GB");
const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return format(n);
};

function StatCard({ label, value, glyph }: { label: string; value: number; glyph: string }) {
  return <View style={styles.statCard}>
    <Text style={styles.statGlyph}>{glyph}</Text>
    <Text style={styles.statValue}>{compact(value)}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>;
}

export default function App() {
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(console.warn);
  }, []);
  const [url, setUrl] = useState(`https://www.tiktok.com/@creator/video/${DEFAULT_ID}`);
  const [videoId, setVideoId] = useState(DEFAULT_ID);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [previousViews, setPreviousViews] = useState<number | null>(null);
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [demo, setDemo] = useState(false);
  const baseline = useRef<{ views: number; at: number } | null>(null);

  const load = useCallback(async (id = videoId) => {
    try {
      setLoading(true);
      const next = await fetchVideoStats(id);
      checkMilestone(id, next.views);
      setStats(next);

      try {
        TikCountWidget.updateSnapshot({
          views: Number(next.views).toLocaleString("en-GB"),
          likes: Number(next.likes).toLocaleString("en-GB"),
          updated: new Date().toLocaleTimeString("en-GB")
        });
      } catch (widgetError) {
        console.log("Widget update:", widgetError);
      }
      setConnected(true);
      setDemo(false);
      setError("");
      setLastUpdated(new Date());
      const parsedTime = Date.parse(next.updatedAt ?? "");
      const timestamp = Number.isFinite(parsedTime) ? parsedTime : Date.now();
      const previous = baseline.current;

      if (!previous) {
        baseline.current = { views: next.views, at: timestamp };
      } else if (timestamp > previous.at && (Number.isFinite(parsedTime) || next.views !== previous.views)) {
        const seconds = (timestamp - previous.at) / 1000;
        const delta = Math.max(0, next.views - previous.views);
        setRate(delta / seconds);
        baseline.current = { views: next.views, at: timestamp };
      }

      setPreviousViews(next.views);
    } catch (e) {
      setConnected(false);
      setError(e instanceof Error ? e.message : "Unable to load video statistics.");
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    load(videoId);
    const timer = setInterval(() => load(videoId), REFRESH_MS);
    return () => clearInterval(timer);
  }, [videoId, load]);

  // Interpolate between verified snapshots for a smooth decimal-style estimate.
  // This is explicitly an estimate, not a TikTok-reported fractional view count.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const estimatedViews = useMemo(() => {
    if (!stats || !baseline.current) return stats?.views ?? 0;
    const elapsed = Math.min((now - baseline.current.at) / 1000, 5);
    return stats.views + rate * elapsed;
  }, [stats, now, rate]);

  const decimalDisplay = estimatedViews.toFixed(2);
  const submit = () => {
    const id = extractVideoId(url);
    if (!id) {
      Alert.alert("Invalid TikTok link", "Paste a public TikTok video link or its numeric video ID.");
      return;
    }
    Keyboard.dismiss();
    if (id === videoId) {
      load(id);
      return;
    }
    setVideoId(id);
    setStats(null);
    setPreviousViews(null);
    setRate(0);
    baseline.current = null;
  };

  const startDemo = () => {
    const demoStats: VideoStats = {
      videoId, title: "Demo video — simulated growth", views: 1486000,
      likes: 82400, comments: 1830, shares: 12100
    };
    setStats(demoStats);
    setPreviousViews(demoStats.views);
    setRate(2.4);
    setDemo(true);
    setConnected(false);
    setError("");
    baseline.current = { views: demoStats.views, at: Date.now() };
    setLastUpdated(new Date());
  };

  const growthPerMinute = rate * 60;
  const milestones = [(Math.floor((stats?.views ?? 0) / 500000) + 1) * 500000];
  const nextMilestone = milestones.find(m => m > (stats?.views ?? 0)) ?? 10000000;
  const progress = Math.min(((stats?.views ?? 0) / nextMilestone) * 100, 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CREATOR TOOLS</Text>
            <Text style={styles.brand}>tokcount <Text style={styles.brandAccent}>live</Text></Text>
          </View>
          <View style={[styles.livePill, connected ? styles.liveOn : styles.liveOff]}>
            <View style={[styles.dot, connected && styles.dotOn]} />
            <Text style={styles.liveText}>{connected ? "LIVE" : demo ? "DEMO" : "OFFLINE"}</Text>
          </View>
        </View>

        <View style={styles.inputPanel}>
          <Text style={styles.inputLabel}>TIKTOK VIDEO</Text>
          <TextInput
            value={url} onChangeText={setUrl} placeholder="Paste TikTok video link or ID"
            placeholderTextColor="#72788A" autoCapitalize="none" autoCorrect={false}
            style={styles.input} returnKeyType="go" onSubmitEditing={submit}
          />
          <Pressable style={styles.trackButton} onPress={submit}>
            {loading ? <ActivityIndicator color="#07100D" /> : <Text style={styles.trackButtonText}>Track video ↗</Text>}
          </Pressable>
          <Text style={styles.videoId}>VIDEO ID  ·  {videoId}</Text>
        </View>

        {error ? <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Live connection not configured</Text>
          <Text style={styles.noticeText}>{error}</Text>
          <Text style={styles.noticeText}>You can preview the interface in demo mode while you connect a stats backend.</Text>
          <Pressable onPress={startDemo}><Text style={styles.noticeAction}>Preview demo →</Text></Pressable>
        </View> : null}

        <View style={styles.counterPanel}>
          <View style={styles.panelTop}>
            <Text style={styles.sectionLabel}>TOTAL VIDEO VIEWS</Text>
            <Text style={styles.refreshLabel}>↻  5 SEC REFRESH</Text>
          </View>
          <Text style={styles.bigNumber}>{stats ? format(stats.views) : "—"}</Text>
          <View style={styles.estimateRow}>
            <View style={styles.estimateDot} />
            <Text style={styles.estimateText}>LIVE ESTIMATE</Text>
            <Text style={styles.decimalNumber}>{stats ? decimalDisplay : "0.00"}</Text>
          </View>
          <Text style={styles.helper}>Decimal digits are a smooth estimate between verified snapshots.</Text>
          <View style={styles.divider} />
          <View style={styles.growthRow}>
            <View><Text style={styles.metricLabel}>VIEWS / SECOND</Text><Text style={styles.metricValue}>{rate.toFixed(2)}</Text></View>
            <View><Text style={styles.metricLabel}>VIEWS / MINUTE</Text><Text style={styles.metricValue}>{format(growthPerMinute)}</Text></View>
            <View><Text style={styles.metricLabel}>PER HOUR</Text><Text style={styles.metricValue}>{compact(rate * 3600)}</Text></View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>ENGAGEMENT</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Likes" value={stats?.likes ?? 0} glyph="♥" />
          <StatCard label="Comments" value={stats?.comments ?? 0} glyph="▤" />
          <StatCard label="Shares" value={stats?.shares ?? 0} glyph="↗" />
        </View>

        <View style={styles.milestonePanel}>
          <View style={styles.milestoneHeader}>
            <Text style={styles.sectionLabel}>NEXT MILESTONE</Text>
            <Text style={styles.milestoneTarget}>{compact(nextMilestone)} views</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <View style={styles.milestoneFooter}>
            <Text style={styles.milestoneCurrent}>{compact(stats?.views ?? 0)} views</Text>
            <Text style={styles.milestonePercent}>{progress.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{lastUpdated ? `Last checked ${lastUpdated.toLocaleTimeString("en-GB")}` : "Waiting for data source"}</Text>
          <Pressable onPress={() => load()}><Text style={styles.refreshAction}>Refresh now ↻</Text></Pressable>
        </View>
        <Text style={styles.disclaimer}>Independent creator tool. Not affiliated with TikTok. Public video data only.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080A10" },
  container: { padding: 20, paddingTop: 16, paddingBottom: 44, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  eyebrow: { color: "#858B9D", fontSize: 10, letterSpacing: 2.5, fontWeight: "800" },
  brand: { color: "#F6F7FB", fontSize: 30, fontWeight: "900", letterSpacing: -1.4 },
  brandAccent: { color: "#45E0A1" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30, borderWidth: 1 },
  liveOn: { backgroundColor: "#10291F", borderColor: "#245A43" },
  liveOff: { backgroundColor: "#171923", borderColor: "#303442" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#74798A" },
  dotOn: { backgroundColor: "#45E0A1" },
  liveText: { color: "#D9E2DD", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  inputPanel: { backgroundColor: "#121520", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#242938", gap: 10 },
  inputLabel: { color: "#858B9D", fontSize: 10, letterSpacing: 1.8, fontWeight: "800" },
  input: { backgroundColor: "#090C14", color: "#F4F5FA", borderRadius: 12, borderWidth: 1, borderColor: "#2B3040", paddingHorizontal: 13, paddingVertical: 14, fontSize: 13 },
  trackButton: { backgroundColor: "#45E0A1", padding: 14, borderRadius: 12, alignItems: "center" },
  trackButtonText: { color: "#07100D", fontWeight: "900", fontSize: 14 },
  videoId: { color: "#737A8C", fontSize: 10, letterSpacing: 1 },
  notice: { backgroundColor: "#2A2115", borderColor: "#624A24", borderWidth: 1, borderRadius: 15, padding: 15, gap: 7 },
  noticeTitle: { color: "#FFD28A", fontWeight: "800", fontSize: 13 },
  noticeText: { color: "#C8B99E", fontSize: 12, lineHeight: 18 },
  noticeAction: { color: "#FFD28A", fontWeight: "800", marginTop: 4 },
  counterPanel: { backgroundColor: "#121923", borderColor: "#244638", borderWidth: 1, borderRadius: 22, padding: 19, gap: 12 },
  panelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { color: "#8B97A3", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  refreshLabel: { color: "#45E0A1", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  bigNumber: { color: "#F8FFFB", fontSize: 43, fontWeight: "900", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  estimateRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  estimateDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#45E0A1" },
  estimateText: { color: "#9AA6A5", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  decimalNumber: { color: "#45E0A1", fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
  helper: { color: "#77828B", fontSize: 10, lineHeight: 15 },
  divider: { height: 1, backgroundColor: "#29343A", marginVertical: 3 },
  growthRow: { flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { color: "#7E8B91", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  metricValue: { color: "#EAF5F0", fontSize: 19, fontWeight: "800", marginTop: 5, fontVariant: ["tabular-nums"] },
  sectionHeading: { color: "#E6E8EF", fontSize: 12, letterSpacing: 1.5, fontWeight: "900", marginTop: 2 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: "#121520", borderRadius: 16, borderWidth: 1, borderColor: "#242938", padding: 13, gap: 5 },
  statGlyph: { color: "#45E0A1", fontSize: 16, fontWeight: "900" },
  statValue: { color: "#F4F5FA", fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#858B9D", fontSize: 10 },
  milestonePanel: { backgroundColor: "#121520", borderRadius: 17, borderColor: "#242938", borderWidth: 1, padding: 16, gap: 12 },
  milestoneHeader: { flexDirection: "row", justifyContent: "space-between" },
  milestoneTarget: { color: "#45E0A1", fontSize: 11, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: "#292E3A", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 8, backgroundColor: "#45E0A1" },
  milestoneFooter: { flexDirection: "row", justifyContent: "space-between" },
  milestoneCurrent: { color: "#8D95A5", fontSize: 10 },
  milestonePercent: { color: "#DDF8EA", fontSize: 10, fontWeight: "800" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 },
  footerText: { color: "#6F7788", fontSize: 10 },
  refreshAction: { color: "#45E0A1", fontWeight: "800", fontSize: 11 },
  disclaimer: { color: "#555D6D", fontSize: 9, textAlign: "center", lineHeight: 14 }
});
