import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Sheet,
    SheetProps,
    SizableText,
    TextProps,
    XStack,
    XStackProps,
    withStaticProperties,
} from 'tamagui';

type ItemProps = XStackProps & {
    children: TextProps['children'];
};

function Item(props: ItemProps) {
    const { children, ...rest } = props;

    return (
        <XStack
            pressStyle={{ bg: '$backgroundStrong' }}
            px="$5"
            py="$4"
            {...rest}
        >
            <SizableText userSelect="none" size="$6">
                {children}
            </SizableText>
        </XStack>
    );
}

function Menu(props: SheetProps) {
    const insets = useSafeAreaInsets();

    return (
        <Sheet modal dismissOnSnapToBottom open snapPointsMode="fit" {...props}>
            <Sheet.Overlay />
            <Sheet.Handle />
            <Sheet.Frame gap="$1" pb={insets.bottom}>
                {props.children}
            </Sheet.Frame>
        </Sheet>
    );
}

export default withStaticProperties(Menu, {
    Item,
});
