import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../services/ConnectionContext';

const HomeScreen: React.FC = () => {
  const { deviceInfo, isConnected, connect } = useConnection();

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, []);

  const formatDisplayId = (id: string | null): string => {
    if (!id) return '--- --- ---';
    return id.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.title}>SwiftConnect</Text>
          </View>
          <View style={[styles.statusBadge, isConnected ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, isConnected ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusText}>{isConnected ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        {/* Your ID Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your SwiftConnect ID</Text>
          <Text style={styles.cardSubtitle}>Share this ID to receive connections</Text>

          <View style={styles.idContainer}>
            <Text style={styles.idText}>{formatDisplayId(deviceInfo.displayId)}</Text>
          </View>

          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => deviceInfo.displayId && copyToClipboard(deviceInfo.displayId, 'ID')}
          >
            <Text style={styles.copyButtonText}>Copy ID</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.passwordRow}>
            <View>
              <Text style={styles.passwordLabel}>Session Password</Text>
              <Text style={styles.passwordText}>{deviceInfo.sessionPassword || '------'}</Text>
            </View>
            <TouchableOpacity
              style={styles.smallCopyButton}
              onPress={() =>
                deviceInfo.sessionPassword && copyToClipboard(deviceInfo.sessionPassword, 'Password')
              }
            >
              <Text style={styles.smallCopyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#6366f120' }]}>
              <Text style={styles.featureIconText}>🖥️</Text>
            </View>
            <Text style={styles.featureTitle}>Remote Desktop</Text>
            <Text style={styles.featureDesc}>Control any PC</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#10b98120' }]}>
              <Text style={styles.featureIconText}>📁</Text>
            </View>
            <Text style={styles.featureTitle}>File Transfer</Text>
            <Text style={styles.featureDesc}>Up to 4GB</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#f59e0b20' }]}>
              <Text style={styles.featureIconText}>🔒</Text>
            </View>
            <Text style={styles.featureTitle}>Encrypted</Text>
            <Text style={styles.featureDesc}>AES-256</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#ef444420' }]}>
              <Text style={styles.featureIconText}>⚡</Text>
            </View>
            <Text style={styles.featureTitle}>Low Latency</Text>
            <Text style={styles.featureDesc}>Fast connection</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusOnline: {
    backgroundColor: '#10b98120',
  },
  statusOffline: {
    backgroundColor: '#ef444420',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 20,
  },
  idContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  idText: {
    color: '#6366f1',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  passwordText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  smallCopyButton: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallCopyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: '50%',
    padding: 6,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 20,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    color: '#64748b',
    fontSize: 12,
  },
});

export default HomeScreen;
