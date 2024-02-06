import { LogBox } from 'react-native';
import '../utils/storage';

import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AdpProvider } from '../providers/adp';
import { ConfigProvider } from '../providers/config';
import { DatabaseProvider } from '../providers/database';
import { NotificationProvider } from '../providers/notification-manager';
import { config } from '../tamagui.config';
import { TamaguiProvider } from 'tamagui';
import { ToastProvider } from '@tamagui/toast';
import { CustomToast, SafeToastViewport } from '../components/toast';

// Thanks to https://github.com/tamagui/tamagui/issues/2042#issuecomment-1879261095
LogBox.ignoreLogs([
    'Warning: Cannot update a component (`Button`) while rendering a different component (`Theme`). To locate the bad setState() call inside `Theme`, follow the stack trace as described in https://react.dev/link/setstate-in-render'
]);

export const unstable_settings = {
    // Ensure that reloading on `/modal` keeps a back button present.
    initialRouteName: 'index',
};

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
        InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
    });

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) {
            throw error;
        }
    }, [error]);

    if (!loaded) {
        return null;
    }

    return <RootLayoutNav />;
}

function RootLayoutNav() {
    const colorScheme = useColorScheme();

    return (
        <TamaguiProvider config={config} defaultTheme={colorScheme as any}>
            <ToastProvider swipeDirection="horizontal" duration={6000}>
                <ThemeProvider
                    value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
                >
                    <ConfigProvider>
                        <DatabaseProvider>
                            <NotificationProvider>
                                <AdpProvider>
                                    <Stack
                                        screenOptions={{ headerShown: false }}
                                    />
                                </AdpProvider>
                            </NotificationProvider>
                        </DatabaseProvider>
                    </ConfigProvider>
                    <CustomToast />
                    <SafeToastViewport />
                </ThemeProvider>
            </ToastProvider>
        </TamaguiProvider>
    );
}
