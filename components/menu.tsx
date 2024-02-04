import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    H5,
    Sheet,
    SheetProps,
    TextProps,
    withStaticProperties,
    XStack,
    XStackProps,
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
            <H5 userSelect="none">{children}</H5>
        </XStack>
    );
}

function Menu(props: SheetProps) {
    const insets = useSafeAreaInsets();

    return (
        <Sheet modal dismissOnSnapToBottom open snapPointsMode="fit" {...props}>
            <Sheet.Overlay />
            <Sheet.Handle />
            <Sheet.Frame space="$1" pb={insets.bottom}>
                {props.children}
            </Sheet.Frame>
        </Sheet>
    );
}

export default withStaticProperties(Menu, {
    Item,
});
