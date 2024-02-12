import {
    SizableText,
    Stack,
    XStack,
    YStack,
    styled,
    withStaticProperties,
} from 'tamagui';

const TimeEntryIcon = styled(Stack, {
    name: 'TimeEntryIcon',
    mt: 16,
});

const TimeEntryText = styled(YStack, {
    name: 'TimeEntryText',
});

const TimeEntryLabel = styled(SizableText, {
    name: 'TimeEntryLabel',
    size: '$1',
    lh: 12,
});

const TimeEntryTime = styled(SizableText, {
    name: 'TimeEntryTime',
    fontFamily: '$tabular',
    size: '$8',
    lh: 28,
});

const TimeEntryComponent = styled(XStack, {
    name: 'TimeEntry',
    gap: '$4',
});

export const TimeEntry = withStaticProperties(TimeEntryComponent, {
    Icon: TimeEntryIcon,
    Text: TimeEntryText,
    Label: TimeEntryLabel,
    Time: TimeEntryTime,
});
