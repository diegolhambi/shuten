import { ChevronRight } from '@tamagui/lucide-icons';
import { router, Stack } from 'expo-router';
import { XStackProps, YStack } from 'tamagui';

import Item from '@/components/list-item';

function ConfigItem({
    title,
    subTitle,
    ...rest
}: XStackProps & { title: string; subTitle?: string }) {
    return (
        <Item pressable {...rest}>
            <Item.FrameText>
                <Item.Title>{title}</Item.Title>
                {subTitle && <Item.SubTitle>{subTitle}</Item.SubTitle>}
            </Item.FrameText>
            <Item.FrameIcon>
                <ChevronRight />
            </Item.FrameIcon>
        </Item>
    );
}

export default function Config() {
    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Settings',
                }}
            />
            <YStack>
                <ConfigItem
                    onPress={() => {
                        router.push('/settings/hours');
                    }}
                    title="Workdays"
                />
                <ConfigItem
                    onPress={() => {
                        router.push('/settings/notifications');
                    }}
                    title="Notifications"
                />
                <ConfigItem
                    onPress={() => {
                        router.push('/settings/adp');
                    }}
                    title="ADP Integration"
                />
            </YStack>
        </>
    );
}
