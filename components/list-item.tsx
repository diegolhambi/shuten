import {
    SizableText,
    styled,
    withStaticProperties,
    XStack,
    YStack,
} from 'tamagui';

const ItemFrame = styled(XStack, {
    name: 'ItemFrame',

    gap: '$2',
    px: '$4',
    py: '$3',
    bg: '$backgroundTransparent',
    alignItems: 'center',
    justifyContent: 'space-between',
    variants: {
        pressable: {
            true: {
                hoverStyle: { bg: '$backgroundHover' },
                pressStyle: { bg: '$backgroundPress' },
                focusStyle: { bg: '$backgroundFocus' },
            },
        },
    },
});

const ItemFrameText = styled(YStack, {
    name: 'ItemFrameText',

    flexShrink: 1,
});

const ItemFrameIcon = styled(YStack, {
    name: 'ItemFrameIcon',

    flexShrink: 0,
});

const ItemTitle = styled(SizableText, {
    name: 'ItemTitle',

    size: '$7',
});

const ItemSubTitle = styled(SizableText, {
    name: 'ItemSubTitle',

    size: '$3',
    opacity: 0.6,
});

const Item = withStaticProperties(ItemFrame, {
    FrameText: ItemFrameText,
    FrameIcon: ItemFrameIcon,
    Title: ItemTitle,
    SubTitle: ItemSubTitle,
});

export default Item;
