import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ConnectScreen from './src/screens/ConnectScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import FilesScreen from './src/screens/FilesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Context
import { ConnectionProvider } from './src/services/ConnectionContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Connect"
        component={ConnectScreen}
        options={{
          tabBarLabel: 'Connect',
        }}
      />
      <Tab.Screen
        name="Files"
        component={FilesScreen}
        options={{
          tabBarLabel: 'Files',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <ConnectionProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0f172a' },
            }}
          >
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Remote"
              component={RemoteScreen}
              options={{
                gestureEnabled: false,
                animation: 'fade',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
};

export default App;
