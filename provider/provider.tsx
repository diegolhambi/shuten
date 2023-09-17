import { ToastProvider } from '@tamagui/toast';
import { useColorScheme } from 'react-native';
import { TamaguiProvider, TamaguiProviderProps } from 'tamagui';

import { CustomToast, SafeToastViewport } from '../components/toast';
import { config } from '../tamagui.config';

export function Provider({
    children,
    ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
    const scheme = useColorScheme();

    return (
        <TamaguiProvider
            config={config}
            disableInjectCSS
            defaultTheme={scheme === 'dark' ? 'dark' : 'light'}
            {...rest}
        >
            <ToastProvider
                swipeDirection="horizontal"
                duration={6000}
            >
                {children}

                <CustomToast />
                <SafeToastViewport />
            </ToastProvider>
        </TamaguiProvider>
    );
}
