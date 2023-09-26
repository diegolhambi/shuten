import { ToastProvider } from '@tamagui/toast';
import { TamaguiProvider, TamaguiProviderProps } from 'tamagui';

import { CustomToast, SafeToastViewport } from '../components/toast';
import { config } from '../tamagui.config';

export function Provider({
    children,
    ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
    return (
        <TamaguiProvider
            config={config}
            disableInjectCSS
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
