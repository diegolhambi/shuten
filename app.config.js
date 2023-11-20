const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
    name: IS_DEV ? 'Shuten (Dev)' : 'Shuten',
    slug: 'shuten',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'shuten',
    userInterfaceStyle: 'automatic',
    notification: {
        icon: './assets/images/notification.png',
        color: '#ffffff',
    },
    splash: {
        image: './assets/images/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#44bac9',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        infoPlist: {
            UIBackgroundModes: ['remote-notification'],
        },
        bundleIdentifier: IS_DEV
            ? 'com.daigou.shuten.dev'
            : 'com.daigou.shuten',
    },
    android: {
        permissions: ['SCHEDULE_EXACT_ALARM'],
        adaptiveIcon: {
            foregroundImage: './assets/images/adaptive-icon.png',
            monochromeImage: './assets/images/adaptive-icon-mono.png',
            backgroundColor: IS_DEV ? '#ec522c' : '#44bac9',
        },
        package: IS_DEV ? 'com.daigou.shuten.dev' : 'com.daigou.shuten',
    },
    web: {
        bundler: 'metro',
        output: 'static',
    },
    plugins: ['expo-router', 'expo-localization'],
    experiments: {
        typedRoutes: true,
    },
    extra: {
        router: {
            origin: false,
        },
        eas: {
            projectId: '295bdb5f-694a-4c5d-a6d5-a81157ec8842',
        },
    },
    owner: 'daigou',
};
