import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type ClubLogoProps = {
  logoUrl?: string | null;
  clubName: string;
  size?: number;
  showErrorMessage?: boolean;
};

export default function ClubLogo({ logoUrl, clubName, size = 64, showErrorMessage = false }: ClubLogoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const normalizedUrl = (logoUrl ?? "").trim();
  const displayUrl = normalizedUrl;
  const canRenderImage = displayUrl.length > 0 && !hasError;

  const fallbackLetter = useMemo(() => {
    const cleanedName = clubName.trim();
    if (!cleanedName) {
      return "?";
    }
    return cleanedName[0].toUpperCase();
  }, [clubName]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {canRenderImage ? (
        <Image
          key={normalizedUrl}
          source={{ uri: displayUrl, cacheKey: displayUrl }}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="low"
          transition={120}
          style={styles.logo}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : null}

      {isLoading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color="#334155" />
        </View>
      ) : null}

      {!canRenderImage ? (
        <Text style={[styles.fallbackText, { fontSize: Math.max(18, size * 0.38) }]}>
          {fallbackLetter}
        </Text>
      ) : null}

      {showErrorMessage && hasError ? (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>Image failed to load</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  fallbackText: {
    color: "#334155",
    fontWeight: "700",
  },
  errorBadge: {
    position: "absolute",
    bottom: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  errorText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "600",
  },
});
