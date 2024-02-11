import { useTheme as useRnTheme } from '@react-navigation/native';
import { CalendarClock, CalendarDays } from '@tamagui/lucide-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { Tabs } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'tamagui';

export default function TabLayout() {
    const theme = useTheme();
    const rnTheme = useRnTheme();

    useFocusEffect(
        useCallback(() => {
            SystemUI.setBackgroundColorAsync(theme.background.val);

            if (Platform.OS !== 'android') {
                return;
            }

            NavigationBar.setBackgroundColorAsync(rnTheme.colors.card);
        }, [])
    );

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.color.val,
                tabBarInactiveTintColor: theme.gray9.val,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Today',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <CalendarClock color={color} />,
                }}
            />
            <Tabs.Screen
                name="punches-list"
                options={{
                    title: 'Punches',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <CalendarDays color={color} />,
                }}
            />
        </Tabs>
    );
}
