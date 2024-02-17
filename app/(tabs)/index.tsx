import { AreaView } from '@/components/area-view';
import Clock from '@/components/clock';
import { DateHeader } from '@/components/date-header';
import { DayOffMessage } from '@/components/day-off-message';
import { ManualPunch } from '@/components/manual-punch';
import { TimeEntry } from '@/components/time-entry';
import { PunchResult, useAdp } from '@/providers/adp';
import { useConfig } from '@/providers/config';
import { useNotification } from '@/providers/notification-manager';
import { usePunchStore } from '@/providers/punches';
import { Punch } from '@/types/punch';
import { hoursDiff } from '@/utils/date';
import { getDayPunches, monthDaysRange } from '@/utils/punch-list';
import {
    CheckCheck,
    CookingPot,
    EqualSquare,
    LogIn,
    LogOut,
    Plus,
} from '@tamagui/lucide-icons';
import { useToastController } from '@tamagui/toast';
import { SplashScreen, useFocusEffect } from 'expo-router';
import { DateTime, Duration } from 'luxon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import {
    AnimatePresence,
    Button,
    SizableText,
    Spinner,
    Square,
    XStack,
    YStack,
    styled,
} from 'tamagui';

const loadingTexts = [
    'Securing access',
    'Profile loading',
    'Unlocking doors',
    'Accessing...',
    'Connecting dots',
];

export default function TabOneScreen() {
    const [today, setToday] = useState(DateTime.now());
    const [punching, setPunching] = useState(false);

    const [openManualPunch, setOpenManualPunch] = useState(false);

    const {
        state: punchState,
        punches,
        load,
        insert: insertPunch,
        remove: removePunch,
    } = usePunchStore();
    const { state: adpState, punch: punchAdp } = useAdp();
    const { config } = useConfig();
    const notification = useNotification();
    const toast = useToastController();

    useEffect(() => {
        load(monthDaysRange(config.firstDayOfMonth));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setToday(DateTime.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (punchState !== 'Loaded') {
                return;
            }

            notification.requestPermission().then((granted) => {
                if (!granted || __DEV__) {
                    console.log('not scheduling first punch notification');
                    return;
                }

                notification.scheduleFirstPunch(punches);
            });
        }, [punches])
    );

    const loadingApp = useMemo(() => {
        const needAdpToLoad = config.adp.activated && adpState !== 'Logged';

        return needAdpToLoad || punchState !== 'Loaded';
    }, [JSON.stringify(config), adpState, punchState]);

    const todayHoursToWork = useMemo(() => {
        return config.hoursToWork[today.weekday];
    }, [JSON.stringify(config), today.toISODate()]);

    const todayPunches = useMemo(() => {
        return getDayPunches(punches, config)(today.toISODate());
    }, [punches, today.toISODate()]);

    const isNotWorkDay = useMemo(() => {
        return todayPunches.some((punch: Punch) => {
            return punch.type !== 'punch';
        });
    }, [todayPunches]);

    const dayType = useMemo(() => {
        return todayPunches[0]?.type;
    }, [todayPunches]);

    const totalHoursToWork = useMemo(() => {
        const isoTotalHours = todayHoursToWork.durations.reduce(
            (acc, value, index) => {
                if (index % 2 === 0) {
                    return Duration.fromISO(acc)
                        .plus(Duration.fromISO(value))
                        .rescale()
                        .toISO() as string;
                }

                return acc;
            },
            'PT0H0M'
        );

        return Duration.fromISO(isoTotalHours);
    }, [todayHoursToWork]);

    const totalWorkedHours = useMemo(() => {
        const tempPunches = punches[today.toISODate()] || [];

        const totalDuration = tempPunches.reduce(
            (acc, punch, index, punches) => {
                const start = DateTime.fromISO(punch.time);

                if (index % 2 === 0) {
                    const end = punches[index + 1]
                        ? DateTime.fromISO(punches[index + 1].time)
                        : today;

                    return Duration.fromISO(acc)
                        .plus(end.diff(start))
                        .rescale()
                        .toISO() as string;
                }

                if (punches.length === 2 && index === 1) {
                    return Duration.fromISO(acc)
                        .minus(Duration.fromISO(todayHoursToWork.durations[1]))
                        .plus(today.diff(DateTime.fromISO(punch.time)))
                        .rescale()
                        .toISO() as string;
                }

                return acc;
            },
            'PT0H0M'
        );

        return Duration.fromISO(totalDuration);
    }, [today, punches]);

    const totalOvertime = useMemo(() => {
        return totalWorkedHours.minus(totalHoursToWork).rescale();
    }, [todayHoursToWork, totalWorkedHours]);

    const haveSomePunch = useMemo(() => {
        return todayPunches.some((punch: Punch) => {
            return !punch.predicted && punch.type === 'punch';
        });
    }, [todayPunches]);

    const PunchIcon = useMemo(() => {
        const howManyPunches = punches[today.toISODate()]
            ? punches[today.toISODate()].length
            : 0;

        switch (howManyPunches) {
            case 1:
            case 3:
                return LogOut;
            case todayHoursToWork.punches.length:
                return CheckCheck;
            default:
                return LogIn;
        }
    }, [punches, today.toISODate()]);

    function handleManualPunchChange(open: boolean) {
        if (__DEV__ && !open) {
            setPunching(false);
        }

        setOpenManualPunch(open);
    }

    const punch = async () => {
        setPunching(true);

        if (__DEV__) {
            setOpenManualPunch(true);
            return;
        }

        const punchDate = today;

        const resultPunchStore = await insertPunch(punchDate);

        if (resultPunchStore !== 'Inserted') {
            toast.show('Unable to punch', {
                message: 'Was already punched at this time',
            });

            setPunching(false);
            return;
        }

        setPunching(false);

        if (config.adp.activated && adpState !== 'Logged') {
            toast.show('Unable to punch', {
                message: 'ADP is not ready to punch',
            });

            await removePunch(punchDate);

            setPunching(false);
            return;
        }

        let resultPunchAdp: PunchResult;

        if (!__DEV__) {
            resultPunchAdp = await punchAdp();
        } else {
            resultPunchAdp = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve('Success');
                }, 250);
            });
        }

        if (resultPunchAdp !== 'Success') {
            toast.show('Unable to punch', {
                message: 'Something went wrong with ADP',
            });

            await removePunch(punchDate);

            setPunching(false);
            return;
        }

        notification.scheduleNext(punchDate, todayPunches);

        setPunching(false);
    };

    return (
        <AreaView onLayout={() => SplashScreen.hideAsync()}>
            <DateArea>
                <DateHeader />
            </DateArea>
            <TimeEntryArea>
                {isNotWorkDay && <DayOffMessage type={dayType} />}

                {!isNotWorkDay &&
                    todayPunches.length > 0 &&
                    todayPunches.map((punch: Punch, index: number) => {
                        const opacity = punch.predicted ? 0.5 : 1;
                        const icon =
                            index % 2 === 0 ? (
                                <LogIn size="$1" />
                            ) : (
                                <LogOut size="$1" />
                            );

                        const label =
                            index % 2 === 0 ? 'Clock in' : 'Clock out';
                        return (
                            <React.Fragment
                                key={`todayPunch-${punch.time
                                    }-${!!punch.predicted}`}
                            >
                                {index > 0 && index % 2 === 0 && (
                                    <TimeEntry
                                        my="$3"
                                        o={todayPunches[2]?.predicted ? 0.5 : 1}
                                    >
                                        <TimeEntry.Icon>
                                            <CookingPot size="$1" />
                                        </TimeEntry.Icon>
                                        <TimeEntry.Text>
                                            <TimeEntry.Label>
                                                Lunch duration
                                            </TimeEntry.Label>
                                            <TimeEntry.Time>
                                                {hoursDiff(
                                                    (
                                                        todayPunches[
                                                        index - 1
                                                        ] as Punch
                                                    ).time,
                                                    punch.time
                                                )}
                                            </TimeEntry.Time>
                                        </TimeEntry.Text>
                                    </TimeEntry>
                                )}
                                <TimeEntry o={opacity}>
                                    <TimeEntry.Icon>{icon}</TimeEntry.Icon>
                                    <TimeEntry.Text>
                                        <TimeEntry.Label>
                                            {label}
                                        </TimeEntry.Label>
                                        <TimeEntry.Time>
                                            {punch.time}
                                        </TimeEntry.Time>
                                    </TimeEntry.Text>
                                </TimeEntry>
                            </React.Fragment>
                        );
                    })
                }

                {!isNotWorkDay && todayPunches.length > 0 && (
                    <XStack gap="$3" mt="$3" o={haveSomePunch ? 1 : 0.5}>
                        <TimeEntry>
                            <TimeEntry.Icon>
                                <EqualSquare size="$1" />
                            </TimeEntry.Icon>
                            <TimeEntry.Text>
                                <TimeEntry.Label>Worked</TimeEntry.Label>
                                <TimeEntry.Time>
                                    {totalOvertime > Duration.fromISO('PT0S')
                                        ? totalHoursToWork.toFormat('hh:mm')
                                        : totalWorkedHours.toFormat('hh:mm')}
                                </TimeEntry.Time>
                            </TimeEntry.Text>
                        </TimeEntry>
                        {totalOvertime > Duration.fromISO('PT0S') && (
                            <TimeEntry gap="$3">
                                <TimeEntry.Icon>
                                    <Plus size="$1" />
                                </TimeEntry.Icon>
                                <TimeEntry.Text>
                                    <TimeEntry.Label>Overtime</TimeEntry.Label>
                                    <TimeEntry.Time>
                                        {totalOvertime.toFormat('hh:mm')}
                                    </TimeEntry.Time>
                                </TimeEntry.Text>
                            </TimeEntry>
                        )}
                    </XStack>
                )}
            </TimeEntryArea>

            <ActionArea>
                <AnimatePresence>
                    {loadingApp && <Loading />}

                    {!loadingApp && !punching && <ClockArea key="clock" />}

                    {!loadingApp && (
                        <PunchButton
                            key="button-punch"
                            icon={
                                !loadingApp && punching ? (
                                    <LoadingIcon size="$1.5" />
                                ) : (
                                    <PunchIcon size="$1.5" />
                                )
                            }
                            onPressIn={() => {
                                if (Platform.OS === 'android') {
                                    Vibration.vibrate([50, 20], true);
                                }
                            }}
                            onPressOut={() => {
                                if (Platform.OS === 'android') {
                                    Vibration.cancel();
                                }
                            }}
                            onLongPress={() => {
                                Vibration.cancel();
                                Vibration.vibrate(500, false);

                                punch();
                            }}
                        />
                    )}
                </AnimatePresence>
            </ActionArea>
            <ManualPunch
                open={openManualPunch}
                onOpenChange={handleManualPunchChange}
            />
        </AreaView>
    );
}

function Loading() {
    const text = useMemo(() => {
        return loadingTexts[
            Math.floor(
                Math.random() * loadingTexts.length
            )
        ];
    }, []);

    return (
        <LoadingArea key="loading">
            <Spinner />
            <SizableText>
                {text}
            </SizableText>
        </LoadingArea>

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
});
