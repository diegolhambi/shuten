import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AdpProvider } from '../providers/adp';
import { ConfigProvider } from '../providers/config';
import { DatabaseProvider } from '../providers/database';
import { NotificationProvider } from '../providers/notification-manager';
import { Provider } from '../providers/provider';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
    // Ensure that reloading on `/modal` keeps a back button present.
    initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
        <Provider>
            <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
            >
                <ConfigProvider>
                    <DatabaseProvider>
                        <NotificationProvider>
                            <AdpProvider>
                                <Stack screenOptions={{ headerShown: false }} />
                            </AdpProvider>
                        </NotificationProvider>
                    </DatabaseProvider>
                </ConfigProvider>
            </ThemeProvider>
        </Provider>
    );
}
