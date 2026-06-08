import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { getBodyModelWebViewBundle } from '@/lib/bodyModelWebBundle';
import type { MuscleSlug } from '@/lib/modelViewerHtml';

export type TierColorEntry = {
  r: number; g: number; b: number; a: number;
  er: number; eg: number; eb: number;
};

type Props = {
  highlight?: MuscleSlug | null;
  muscleTiers?: Record<string, TierColorEntry> | null;
};

function toFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

export function BodyModelWebView({ highlight = null, muscleTiers = null }: Props) {
  const webRef = useRef<WebView>(null);
  const [bundle, setBundle] = useState<{
    indexUri: string;
    readAccessDir: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBodyModelWebViewBundle()
      .then((b) => {
        if (!cancelled) {
          if (__DEV__) {
            console.log('[BodyModelWebView] loading', {
              uri: toFileUri(b.indexUri),
              readAccess: toFileUri(b.readAccessDir),
            });
          }
          setBundle(b);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !webRef.current) return;

    if (muscleTiers) {
      const payload = JSON.stringify(muscleTiers);
      if (highlight) {
        const slug = JSON.stringify(highlight);
        webRef.current.injectJavaScript(
          `(function(){ try { window.__setSelectionHighlight(${slug}, ${payload}); } catch(e){} })(); true;`,
        );
      } else {
        webRef.current.injectJavaScript(
          `(function(){ try { window.__setMuscleTiers(${payload}); } catch(e){} })(); true;`,
        );
      }
    } else {
      const arg = highlight ? JSON.stringify(highlight) : 'null';
      webRef.current.injectJavaScript(
        `(function(){ try { window.__setHighlight(${arg}); } catch(e){} })(); true;`,
      );
    }
  }, [highlight, muscleTiers, ready]);

  const onMessage = useCallback((ev: { nativeEvent: { data: string } }) => {
    try {
      const d = JSON.parse(ev.nativeEvent.data) as { type?: string };
      if (d.type === 'ready') setReady(true);
      if (__DEV__) console.log('[BodyModelWebView] msg', d);
    } catch {
      if (__DEV__) console.log('[BodyModelWebView] raw', ev.nativeEvent.data);
    }
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errTitle}>Could not load 3D preview</Text>
        <Text style={styles.errBody}>{error}</Text>
      </View>
    );
  }

  if (!bundle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4C91FF" />
        <Text style={styles.hint}>Preparing model...</Text>
      </View>
    );
  }

  const sourceUri = toFileUri(bundle.indexUri);

  return (
    <WebView
      ref={webRef}
      style={styles.web}
      source={{ uri: sourceUri }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      mixedContentMode="always"
      scrollEnabled={false}
      bounces={false}
      onMessage={onMessage}
      onError={(e) => {
        if (__DEV__) console.log('[BodyModelWebView] onError', e.nativeEvent);
      }}
      onHttpError={(e) => {
        if (__DEV__) console.log('[BodyModelWebView] httpError', e.nativeEvent);
      }}
      {...(Platform.OS === 'ios'
        ? { allowingReadAccessToURL: toFileUri(bundle.readAccessDir) }
        : {})}
    />
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: '#0F0F10',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0F0F10',
  },
  hint: {
    marginTop: 10,
    color: '#888888',
    fontSize: 13,
  },
  errTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errBody: {
    color: '#A0A0A0',
    fontSize: 12,
    textAlign: 'center',
  },
});
