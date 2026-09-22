import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const content = (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuterBackground}>
        <View style={styles.webPhoneContainer}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webOuterBackground: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900 trang trọng
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 16,
  },
  webPhoneContainer: {
    width: '100%',
    maxWidth: 420,
    height: '94vh',
    maxHeight: 900,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 4,
    borderColor: '#334155',
  },
});

