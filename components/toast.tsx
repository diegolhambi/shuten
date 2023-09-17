import { Toast, ToastViewport, useToastState } from '@tamagui/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

export const SafeToastViewport = () => {
    const { left, top, right } = useSafeAreaInsets();
    return (
        <ToastViewport
            top={top + 5}
            left={left}
            right={right}
        />
    );
};

export const CustomToast = () => {
    const currentToast = useToastState();

    if (!currentToast || currentToast.isHandledNatively) {
        return null;
    }

    return (
        <Toast
            key={currentToast.id}
            duration={currentToast.duration}
            viewportName={currentToast.viewportName}
            enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
            exitStyle={{ opacity: 0, scale: 1, y: -20 }}
            y={0}
            opacity={1}
            scale={1}
            animation="quick"
        >
            <YStack>
                <Toast.Title>{currentToast.title}</Toast.Title>
                {!!currentToast.message && (
                    <Toast.Description>
                        {currentToast.message}
                    </Toast.Description>
                )}
            </YStack>
        </Toast>
    );
};
