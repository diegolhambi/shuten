import { PunchType } from '@/types/punch';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SizableText, YStack } from 'tamagui';

export function DayOffMessage({ type = 'dayOff' }: { type?: PunchType }) {
    const group: MessageType = type !== 'vacation' ? 'default' : 'vacation';

    const [message, setMessage] = useState(getRandomMessage(group));

    useFocusEffect(useCallback(() => setMessage(getRandomMessage(group)), [group]));

    return (
        <YStack alignItems="center" px="$4">
            <SizableText size="$9" textAlign="center" mb="$4">
                {message.title}
            </SizableText>
            <SizableText size="$5" textAlign="center" mb="$8">
                {message.text}
            </SizableText>
            <SizableText size="$1" color="$gray8" textAlign="center">
                But if you need to work, just punch it.
            </SizableText>
            <SizableText size="$1" color="$gray8" textAlign="center">
                I won't recommend it.
            </SizableText>
        </YStack>
    );
}

function getRandomMessage(type: MessageType): Message {
    if (!(type in messages)) {
        type = 'default';
    }

    return messages[type]![Math.floor(Math.random() * messages[type]!.length)];
}

type MessageType = Exclude<PunchType, 'punch'> | 'default';
type Message = { title: string; text: string };
type Messages = {
    [K in MessageType]?: Message[];
};

const messages: Messages = {
    vacation: [
        {
            title: 'Vacation Mode Activated',
            text: "Pack your bags and leave the app behind – it's time for some well-deserved vacation days!",
        },
        {
            title: 'Escape the Routine',
            text: 'Break free from the daily grind! Your vacation has begun. No need for the app – go enjoy those sandy beaches!',
        },
        {
            title: 'Adventure Awaits',
            text: 'Hey adventurer! Your work adventure is on hold. Unplug from the work and embark on your vacation escapade!',
        },
        {
            title: 'Beach Mode: On',
            text: "Sandy toes > App notifications. It's your vacation – let the waves be your guide!",
        },
    ],
    default: [
        {
            title: 'No alarms, no rush',
            text: "It's your day to unwind. Leave the app behind and enjoy your well-deserved day off",
        },
        {
            title: 'Time to Unwind',
            text: "Attention superhero! Today's mission: take a break and recharge. No need for work today – you're off duty!",
        },
        {
            title: 'Relaxation Forecast',
            text: "ALERT: Today's forecast includes a 100% chance of relaxation! Skip the app, embrace the leisure, and make the most of your day off.",
        },
        {
            title: 'Official Chill Day',
            text: "Hey there! Today's your day off, so sit back, relax, and enjoy the break. No need to clock in today!",
        },
    ],
} as const;
