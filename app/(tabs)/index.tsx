import { AreaView } from '@/components/area-view';
import Clock from '@/components/clock';
import { DateHeader } from '@/components/date-header';
import { TimeEntry } from '@/components/time-entry';
import { CookingPot, EqualSquare, LogIn, LogOut, Plus } from '@tamagui/lucide-icons';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { AnimatePresence, Button, SizableText, Spinner, Square, XStack, YStack, styled } from 'tamagui';

const loadingTexts = [
    'Securing access',
    'Profile loading',
    'Unlocking doors',
    'Accessing...',
    'Connecting dots',
];

export default function TabOneScreen() {
    const [test, setTest] = useState(true);

    const [loading, setLoading] = useState(true);
    const [punching, setPunching] = useState(false);

    useEffect(() => {
        const fakeDelay = setTimeout(() => {
            setLoading(false);
        }, 1500);

        return () => {
            clearTimeout(fakeDelay);
        };
    }, [loading]);

    const punch = () => {
        setPunching(true);
        setTimeout(() => {
            setPunching(false);
        }, 1000);
    };

    return (
        <AreaView onLayout={() => SplashScreen.hideAsync()}>
            <DateArea>
                <DateHeader />
            </DateArea>
            <TimeEntryArea>
                <TimeEntry o={0.5}>
                    <TimeEntry.Icon>
                        <LogIn size="$1" />
                    </TimeEntry.Icon>
                    <TimeEntry.Text>
                        <TimeEntry.Label>Clock in</TimeEntry.Label>
                        <TimeEntry.Time>08:00</TimeEntry.Time>
                    </TimeEntry.Text>
                </TimeEntry>
                <TimeEntry>
                    <TimeEntry.Icon>
                        <LogOut size="$1" />
                    </TimeEntry.Icon>
                    <TimeEntry.Text>
                        <TimeEntry.Label>Clock out</TimeEntry.Label>
                        <TimeEntry.Time>12:00</TimeEntry.Time>
                    </TimeEntry.Text>
                </TimeEntry>

                <TimeEntry my="$3">
                    <TimeEntry.Icon>
                        <CookingPot size="$1" />
                    </TimeEntry.Icon>
                    <TimeEntry.Text>
                        <TimeEntry.Label>Lunch duration</TimeEntry.Label>
                        <TimeEntry.Time>01:00</TimeEntry.Time>
                    </TimeEntry.Text>
                </TimeEntry>

                <TimeEntry>
                    <TimeEntry.Icon>
                        <LogIn size="$1" />
                    </TimeEntry.Icon>
                    <TimeEntry.Text>
                        <TimeEntry.Label>Clock in</TimeEntry.Label>
                        <TimeEntry.Time>13:10</TimeEntry.Time>
                    </TimeEntry.Text>
                </TimeEntry>
                <TimeEntry>
                    <TimeEntry.Icon>
                        <LogOut size="$1" />
                    </TimeEntry.Icon>
                    <TimeEntry.Text>
                        <TimeEntry.Label>Clock out</TimeEntry.Label>
                        <TimeEntry.Time>17:20</TimeEntry.Time>
                    </TimeEntry.Text>
                </TimeEntry>

                <XStack gap="$3" mt="$3">
                    <TimeEntry>
                        <TimeEntry.Icon>
                            <EqualSquare size="$1" />
                        </TimeEntry.Icon>
                        <TimeEntry.Text>
                            <TimeEntry.Label>Worked</TimeEntry.Label>
                            <TimeEntry.Time>07:20</TimeEntry.Time>
                        </TimeEntry.Text>
                    </TimeEntry>
                    <TimeEntry gap="$3">
                        <TimeEntry.Icon>
                            <Plus size="$1" />
                        </TimeEntry.Icon>
                        <TimeEntry.Text>
                            <TimeEntry.Label>Overtime</TimeEntry.Label>
                            <TimeEntry.Time>01:00</TimeEntry.Time>
                        </TimeEntry.Text>
                    </TimeEntry>
                    <YStack>
                        <Button onPress={() => setLoading(true)}>Loading</Button>
                        <Button onPress={punch}>Punching</Button>
                    </YStack>
                </XStack>
            </TimeEntryArea>

            <ActionArea>
                <AnimatePresence>
                    {loading && (
                        <LoadingArea key="loading">
                            <Spinner />
                            <SizableText>{loadingTexts[Math.floor(Math.random() * loadingTexts.length)]}</SizableText>
                        </LoadingArea>
                    )}
                    {!loading && !punching && (
                        <ClockArea key="clock" />
                    )}
                    {!loading && (
                        <PunchButton 
                            key="button-punch"
                            icon={!loading && punching ? <LoadingIcon /> : <LogIn size="$1.5" />}
                            onPress={() => {
                                setTest(!test);
                            }}
                        />
                    )}
                </AnimatePresence>
            </ActionArea>
        </AreaView>
    );
}

const DateArea = styled(YStack, {
    name: 'DateArea',
    flexShrink: 0,
    px: '$4',
    h: '$15',
    justifyContent: 'center',
});

const TimeEntryArea = styled(YStack, {
    name: 'TimeEntryArea',
    flexGrow: 1,
    px: '$4',
    gap: '$4',
    justifyContent: 'center',
});

const ActionArea = styled(XStack, {
    name: 'ActionArea',
    position: 'relative',
    flexShrink: 0,
    h: 101,
    px: '$4',
    pt: '$3',
    pb: '$5',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',

});

const ClockArea = styled(XStack, {
    name: 'ClockArea',
    children: <Clock />,
    elevation: '$1',
    position: 'absolute',
    right: '$4',
    bottom: '$5',
    bg: '$background',
    borderRadius: '$6',
    alignItems: 'center',
    h: '$6',
    pr: '$11',
    animation: 'medium',
    enterStyle: {
        x: 0,
        o: 1,
    },
    exitStyle: {
        x: 100,
        o: 0,
    },
});

const PunchButton = styled(Button, {
    name: 'PunchButton',
    px: '$5',
    elevation: '$1',
    size: '$6',
    animation: 'medium',
    enterStyle: {
        x: 0,
        o: 1,
    },
    exitStyle: {
        o: 0,
        x: 200,
    },
});

const LoadingIcon = styled(Square, {
    name: 'LoadingIcon',
    children: <Spinner />,
    size: '$1.5',
    alignItems: 'center',
    justifyContent: 'center',
});

const LoadingArea = styled(XStack, {
    name: 'LoadingArea',
    elevation: '$1',
    position: 'absolute',
    right: '$4',
    bottom: '$5',
    px: '$4',
    h: '$6',
    gap: '$3',
    bg: '$background',
    alignItems: 'center',
    borderRadius: '$6',
    animation: '100ms',
    enterStyle: {
        x: 0,
    },
    exitStyle: {
        x: 100,
        o: 0,
    },
})
