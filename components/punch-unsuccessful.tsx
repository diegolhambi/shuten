import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import { type SheetProps, Sheet, SizableText } from 'tamagui';

export function PunchUnsuccessful(props: SheetProps) {
    useEffect(() => {
        if (props.open) {
            Vibration.vibrate(1000);
        }
    }, [props.open]);

    return (
        <Sheet snapPointsMode="fit" modal {...props}>
            <Sheet.Overlay />
            <Sheet.Handle />
            <Sheet.Frame
                gap="$1"
                px="$6"
                pt="$6"
                pb={Platform.OS === 'android' ? '$0' : '$6'}
            >
                <SizableText size="$8" textAlign="center">
                    Punch unsuccessful
                </SizableText>
                <SizableText size="$6" textAlign="center" my="$8">
                    We couldn't record your punch. Please check your internet
                    connection and try again.
                </SizableText>
            </Sheet.Frame>
        </Sheet>
    );
}
