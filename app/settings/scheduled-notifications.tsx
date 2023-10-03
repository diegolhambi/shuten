import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView } from 'react-native';
import { Button, SizableText, YStack } from 'tamagui';

export default function ScheduledNotifications() {
    const [notifications, setNotifications] = useState<
        Notifications.NotificationRequest[]
    >([]);

    useEffect(() => {
        Notifications.getAllScheduledNotificationsAsync().then(
            (notifications) => {
                setNotifications(notifications);
            },
        );
    }, [DateTime.now().toSeconds()]);

    return (
        <SafeAreaView>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Scheduled Notifications',
                }}
            />
            <Button
                onPress={() =>
                    Notifications.cancelAllScheduledNotificationsAsync()
                }
            >
                Cancel All
            </Button>
            <FlatList
                data={notifications}
                renderItem={({ item }) => (
                    <YStack
                        key={item.identifier}
                        mb="$4"
                    >
                        <SizableText>{item.identifier}</SizableText>
                        <SizableText>{item.content.title}</SizableText>
                        <SizableText>{item.content.body}</SizableText>
                    </YStack>
                )}
            />
        </SafeAreaView>
    );
}
