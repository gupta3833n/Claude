import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../services/ConnectionContext';

interface Transfer {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  direction: 'upload' | 'download';
  timestamp: number;
}

const FilesScreen: React.FC = () => {
  const { isInSession } = useConnection();
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleSelectFile = async () => {
    if (!isInSession) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    // In real implementation, use document picker
    Alert.alert('Select File', 'File picker would open here');
  };

  const getStatusColor = (status: Transfer['status']): string => {
    switch (status) {
      case 'in-progress': return '#6366f1';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: Transfer['status']): string => {
    switch (status) {
      case 'in-progress': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏱️';
    }
  };

  const renderTransfer = ({ item }: { item: Transfer }) => (
    <View style={styles.transferItem}>
      <View style={styles.transferIcon}>
        <Text style={styles.transferIconText}>
          {item.direction === 'upload' ? '📤' : '📥'}
        </Text>
      </View>
      <View style={styles.transferInfo}>
        <Text style={styles.transferFileName} numberOfLines={1}>
          {item.fileName}
        </Text>
        <View style={styles.transferDetails}>
          <Text style={styles.transferSize}>{formatSize(item.fileSize)}</Text>
          <Text style={[styles.transferStatus, { color: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)} {item.status}
          </Text>
        </View>
        {item.status === 'in-progress' && (
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${item.progress}%` }]}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>File Transfer</Text>
        <Text style={styles.subtitle}>Send and receive files securely</Text>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[styles.uploadCard, !isInSession && styles.uploadCardDisabled]}
        onPress={handleSelectFile}
        disabled={!isInSession}
      >
        <View style={styles.uploadIcon}>
          <Text style={styles.uploadIconText}>📁</Text>
        </View>
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadTitle}>Send Files</Text>
          <Text style={styles.uploadSubtitle}>
            {isInSession ? 'Tap to select files' : 'Connect to a device first'}
          </Text>
        </View>
        <Text style={styles.uploadArrow}>→</Text>
      </TouchableOpacity>

      {/* Status Message */}
      {!isInSession && (
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Connect to a remote device to start transferring files
          </Text>
        </View>
      )}

      {/* Transfer History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Transfer History</Text>

        {transfers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No transfers yet</Text>
            <Text style={styles.emptySubtitle}>
              Your file transfers will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={transfers}
            renderItem={renderTransfer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.transferList}
          />
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📋 Transfer Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Max file size</Text>
          <Text style={styles.infoValue}>4 GB</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Encryption</Text>
          <Text style={styles.infoValue}>AES-256</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Protocol</Text>
          <Text style={styles.infoValue}>WebRTC Data Channel</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  uploadCardDisabled: {
    borderColor: '#334155',
    opacity: 0.6,
  },
  uploadIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  uploadIconText: {
    fontSize: 24,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadSubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  uploadArrow: {
    color: '#6366f1',
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 14,
  },
  historySection: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  transferList: {
    gap: 12,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transferIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transferIconText: {
    fontSize: 20,
  },
  transferInfo: {
    flex: 1,
  },
  transferFileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transferDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  transferSize: {
    color: '#64748b',
    fontSize: 12,
  },
  transferStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FilesScreen;
