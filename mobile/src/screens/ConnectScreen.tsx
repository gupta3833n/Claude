import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../services/ConnectionContext';

const ConnectScreen: React.FC = () => {
  const navigation = useNavigation();
  const { requestConnection, isConnected } = useConnection();

  const [targetId, setTargetId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const formatIdInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join(' ');
  };

  const handleConnect = async () => {
    if (!targetId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both ID and password');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    setIsConnecting(true);

    try {
      const result = await requestConnection(
        targetId.replace(/\s/g, ''),
        password.toUpperCase()
      );

      if (result.success) {
        // Navigate to remote screen on successful connection
        (navigation as any).navigate('Remote');
      } else {
        Alert.alert('Connection Failed', result.error || 'Unable to connect');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Remote Control</Text>
            <Text style={styles.subtitle}>Connect to another device</Text>
          </View>

          {/* Connection Form */}
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🔗</Text>
            </View>

            <Text style={styles.cardTitle}>Connect to Partner</Text>
            <Text style={styles.cardSubtitle}>Enter the partner's SwiftConnect ID</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Partner ID</Text>
              <TextInput
                style={styles.input}
                value={targetId}
                onChangeText={(text) => setTargetId(formatIdInput(text))}
                placeholder="XXX XXX XXX"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                maxLength={11}
                textAlign="center"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => setPassword(text.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                maxLength={6}
                textAlign="center"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.connectButton,
                (!targetId.trim() || !password.trim() || isConnecting) && styles.connectButtonDisabled,
              ]}
              onPress={handleConnect}
              disabled={!targetId.trim() || !password.trim() || isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>💡 How to connect</Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>1. Ask your partner for their 9-digit ID</Text>
              <Text style={styles.instructionItem}>2. Enter the ID and session password</Text>
              <Text style={styles.instructionItem}>3. Click Connect and wait for approval</Text>
            </View>
          </View>

          {/* Recent Connections */}
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>Recent Connections</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⏱️</Text>
              <Text style={styles.emptyText}>No recent connections</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
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
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  recentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});

export default ConnectScreen;
