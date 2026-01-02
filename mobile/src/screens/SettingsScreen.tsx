import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from '../services/ConnectionContext';

interface Settings {
  quality: 'auto' | 'high' | 'medium' | 'low';
  enableClipboardSync: boolean;
  enableVibration: boolean;
  enableSound: boolean;
  serverUrl: string;
}

const SettingsScreen: React.FC = () => {
  const { isConnected, deviceInfo, disconnect } = useConnection();

  const [settings, setSettings] = useState<Settings>({
    quality: 'auto',
    enableClipboardSync: true,
    enableVibration: true,
    enableSound: true,
    serverUrl: 'http://localhost:3000',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all stored data including device ID. You will get a new ID.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            disconnect();
            Alert.alert('Success', 'All data cleared');
          },
        },
      ]
    );
  };

  const qualityOptions: Array<{ value: 'auto' | 'high' | 'medium' | 'low'; label: string }> = [
    { value: 'auto', label: 'Auto' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your preferences</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, isConnected ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.statusText}>{isConnected ? 'Connected to server' : 'Disconnected'}</Text>
            </View>
          </View>
          {deviceInfo.displayId && (
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Your ID</Text>
              <Text style={styles.deviceId}>
                {deviceInfo.displayId.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
              </Text>
            </View>
          )}
        </View>

        {/* Video Quality */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Video Quality</Text>
          <Text style={styles.cardSubtitle}>Adjust streaming quality</Text>
          <View style={styles.qualityOptions}>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.qualityOption,
                  settings.quality === option.value && styles.qualityOptionActive,
                ]}
                onPress={() => updateSetting('quality', option.value)}
              >
                <Text
                  style={[
                    styles.qualityOptionText,
                    settings.quality === option.value && styles.qualityOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Clipboard Sync</Text>
              <Text style={styles.settingSubtitle}>Sync clipboard with remote device</Text>
            </View>
            <Switch
              value={settings.enableClipboardSync}
              onValueChange={(value) => updateSetting('enableClipboardSync', value)}
              trackColor={{ false: '#334155', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingSubtitle}>Haptic feedback for touches</Text>
            </View>
            <Switch
              value={settings.enableVibration}
              onValueChange={(value) => updateSetting('enableVibration', value)}
              trackColor={{ false: '#334155', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sound Effects</Text>
              <Text style={styles.settingSubtitle}>Play sounds for events</Text>
            </View>
            <Switch
              value={settings.enableSound}
              onValueChange={(value) => updateSetting('enableSound', value)}
              trackColor={{ false: '#334155', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Advanced */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Advanced</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={settings.serverUrl}
              onChangeText={(text) => updateSetting('serverUrl', text)}
              placeholder="http://localhost:3000"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2024.1</Text>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://swiftconnect.io')}
          >
            <Text style={styles.linkButtonText}>Visit Website</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://swiftconnect.io/privacy')}
          >
            <Text style={styles.linkButtonText}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://swiftconnect.io/terms')}
          >
            <Text style={styles.linkButtonText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Made with ❤️ by SwiftConnect Team</Text>
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
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
  deviceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  deviceLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  deviceId: {
    color: '#6366f1',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  qualityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  qualityOptionActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  qualityOptionText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  qualityOptionTextActive: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#ef444420',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  aboutLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  aboutValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  linkButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  linkButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});

export default SettingsScreen;
