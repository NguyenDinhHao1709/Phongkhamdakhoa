import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

import HomeScreen from '../screens/Home/HomeScreen';
import BookingScreen from '../screens/Booking/BookingScreen';
import QueueTrackerScreen from '../screens/Queue/QueueTrackerScreen';
import MedicalRecordsScreen from '../screens/Records/MedicalRecordsScreen';
import AiDoctorChatScreen from '../screens/ChatAI/AiDoctorChatScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Booking') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Queue') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'ChatAI') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Booking" component={BookingScreen} options={{ tabBarLabel: 'Đặt lịch & Hẹn' }} />
      <Tab.Screen name="Queue" component={QueueTrackerScreen} options={{ tabBarLabel: 'Tiến độ & STT' }} />
      <Tab.Screen name="Records" component={MedicalRecordsScreen} options={{ tabBarLabel: 'Hồ sơ EMR' }} />
      <Tab.Screen name="ChatAI" component={AiDoctorChatScreen} options={{ tabBarLabel: 'Trợ lý AI' }} />
    </Tab.Navigator>
  );
}

