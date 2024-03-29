import { Stack, useFocusEffect } from 'expo-router';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { FlatList, SafeAreaView } from 'react-native';
import { SizableText, YStack } from 'tamagui';

import { useAdp } from '@/providers/adp';
import { is24hourClock } from '@/utils/date';

export default function ScheduledNotifications() {
    const adp = useAdp();

    const [punches, setPunches] = useState<DateTime[]>([]);

    useFocusEffect(() => {
        adp.punches().then((result) => {
            if (result) {
                if (!Array.isArray(result)) {
                    return;
                }

                setPunches(result);
            }
        });
    });

    return (
        <SafeAreaView>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'ADP punches',
                }}
            />

            <FlatList
                data={punches}
                renderItem={({ item }) => (
                    <YStack key={item.toISO()} px="$2" m="$4">
                        <SizableText size="$6">
                            {item.toISODate()}
                            {` `}
                            {item.toLocaleString(
                                is24hourClock()
                                    ? DateTime.TIME_24_SIMPLE
                                    : DateTime.TIME_SIMPLE
                            )}
                        </SizableText>
                    </YStack>
                )}
            />
        </SafeAreaView>
    );
}
