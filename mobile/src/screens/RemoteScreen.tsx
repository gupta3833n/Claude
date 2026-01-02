import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../services/ConnectionContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RemoteScreen: React.FC = () => {
  const navigation = useNavigation();
  const { endSession, sendInputEvent, connectedDeviceName, socket } = useConnection();

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState<'auto' | 'high' | 'medium' | 'low'>('auto');
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [touchMode, setTouchMode] = useState<'mouse' | 'touch'>('mouse');

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    // Listen for video frames
    if (socket) {
      socket.on('signal', (data: any) => {
        if (data.type === 'video-frame') {
          setCurrentFrame(data.payload.data);
        }
      });
    }

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [socket]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event: GestureResponderEvent) => {
        resetControlsTimeout();

        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // Double tap - double click
          const { locationX, locationY } = event.nativeEvent;
          sendInputEvent({
            type: 'mouse',
            action: 'doubleclick',
            x: locationX / SCREEN_WIDTH,
            y: locationY / SCREEN_HEIGHT,
          });
        }
        lastTapRef.current = now;
      },

      onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { locationX, locationY } = event.nativeEvent;
        sendInputEvent({
          type: 'mouse',
          action: 'move',
          x: locationX / SCREEN_WIDTH,
          y: locationY / SCREEN_HEIGHT,
        });
      },

      onPanResponderRelease: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // Check if it's a tap (no significant movement)
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          const { locationX, locationY } = event.nativeEvent;
          sendInputEvent({
            type: 'mouse',
            action: 'click',
            x: locationX / SCREEN_WIDTH,
            y: locationY / SCREEN_HEIGHT,
          });
        }
      },
    })
  ).current;

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to disconnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            endSession();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleRightClick = () => {
    sendInputEvent({
      type: 'mouse',
      action: 'rightclick',
      x: 0.5,
      y: 0.5,
    });
  };

  const handleScroll = (direction: 'up' | 'down') => {
    sendInputEvent({
      type: 'mouse',
      action: 'scroll',
      x: 0.5,
      y: 0.5,
      scrollDelta: direction === 'up' ? 100 : -100,
    });
  };

  return (
    <View style={styles.container}>
      {/* Remote View */}
      <View style={styles.remoteView} {...panResponder.panHandlers}>
        {currentFrame ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${currentFrame}` }}
            style={styles.remoteImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.waitingView}>
            <Text style={styles.waitingIcon}>🖥️</Text>
            <Text style={styles.waitingText}>Waiting for screen...</Text>
            <Text style={styles.waitingSubtext}>Connected to {connectedDeviceName}</Text>
          </View>
        )}
      </View>

      {/* Top Bar */}
      {showControls && (
        <SafeAreaView style={styles.topBar}>
          <View style={styles.topBarContent}>
            <View style={styles.connectionInfo}>
              <View style={styles.connectionDot} />
              <Text style={styles.connectionName}>{connectedDeviceName}</Text>
            </View>
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleEndSession}
            >
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            {/* Mouse Mode Toggle */}
            <TouchableOpacity
              style={[styles.controlButton, touchMode === 'mouse' && styles.controlButtonActive]}
              onPress={() => setTouchMode(touchMode === 'mouse' ? 'touch' : 'mouse')}
            >
              <Text style={styles.controlIcon}>{touchMode === 'mouse' ? '🖱️' : '👆'}</Text>
            </TouchableOpacity>

            {/* Right Click */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleRightClick}
            >
              <Text style={styles.controlIcon}>📋</Text>
            </TouchableOpacity>

            {/* Scroll Up */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleScroll('up')}
            >
              <Text style={styles.controlIcon}>⬆️</Text>
            </TouchableOpacity>

            {/* Scroll Down */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleScroll('down')}
            >
              <Text style={styles.controlIcon}>⬇️</Text>
            </TouchableOpacity>

            {/* Keyboard */}
            <TouchableOpacity style={styles.controlButton}>
              <Text style={styles.controlIcon}>⌨️</Text>
            </TouchableOpacity>

            {/* Quality */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                const qualities: Array<'auto' | 'high' | 'medium' | 'low'> = ['auto', 'high', 'medium', 'low'];
                const currentIndex = qualities.indexOf(quality);
                const nextIndex = (currentIndex + 1) % qualities.length;
                setQuality(qualities[nextIndex]);
              }}
            >
              <Text style={styles.qualityText}>{quality.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  waitingView: {
    alignItems: 'center',
  },
  waitingIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  waitingText: {
    color: '#64748b',
    fontSize: 18,
    marginBottom: 8,
  },
  waitingSubtext: {
    color: '#475569',
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  connectionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  endButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 34,
    paddingTop: 12,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#6366f1',
  },
  controlIcon: {
    fontSize: 20,
  },
  qualityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RemoteScreen;
