import { ManualPunch } from '@/components/manual-punch';
import Menu from '@/components/menu';
import { PunchesCalendar } from '@/components/punches-calendar';
import { useConfig } from '@/providers/config';
import { usePunchStore } from '@/providers/punches';
import { useForeground } from '@/utils/app-state';
import type { Weekday } from '@/utils/date';
import {
    days,
    hoursToBeWorked,
    monthDaysRange,
    predictDailyPunches,
    workedTimeFromPunches,
} from '@/utils/punch-list';
import { toDateId } from '@marceloterreiro/flash-calendar';
import { fromDateId } from '@marceloterreiro/flash-calendar/src/helpers/dates';
import { Calendar as CalendarIcon, MoreVertical } from '@tamagui/lucide-icons';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DateTime, Duration } from 'luxon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button,
    ScrollView,
    SizableText,
    XGroup,
    XStack,
    YStack,
} from 'tamagui';

const startOfThisMonth = DateTime.now().startOf('month');

export default function PunchesScreen() {
    const [today, setToday] = useState(DateTime.now());

    const [openMenu, setOpenMenu] = useState(false);
    const [openManualPunch, setOpenManualPunch] = useState(false);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>();

    const [devMode, setDevMode] = useState(__DEV__);

    const { config } = useConfig();
    const { punches, nuke } = usePunchStore();

    const listDaysToWork = useMemo(
        () => days(config.firstDayOfMonth),
        [JSON.stringify(config)]
    );

    const calculatedMonthRange = useMemo(
        () => monthDaysRange(config.firstDayOfMonth),
        [today]
    );

    const ignoredDates = useMemo(() => {
        const ignored = listDaysToWork.filter((date) => {
            return !config.hoursToWork[
                DateTime.fromSQL(date).weekday as Weekday
            ].punches.length;
        });

        return ignored.filter((date) => {
            if (
                punches[date] &&
                punches[date].some((punch) => punch.type == 'punch')
            ) {
                return false;
            }

            return true;
        });
    }, [calculatedMonthRange, punches]);

    const howManyPunches = useMemo(
        () => Object.values(punches).flat().length,
        [JSON.stringify(punches)]
    );

    const { monthTotalWorked, monthTotalOvertime } = useMemo(() => {
        let worked = Duration.fromISO('PT0H0M') as Duration<true>;
        let overtime = Duration.fromISO('PT0H0M') as Duration<true>;

        const keys = Object.keys(punches);

        for (const key of keys) {
            const day = DateTime.fromSQL(key) as DateTime<true>;

            const a = workedTimeFromPunches(day, punches[key]);
            const b = hoursToBeWorked(day, config);

            worked = worked.plus(a);

            if (a.toMillis() > b.toMillis()) {
                overtime = overtime.plus(a.minus(b));
            }
        }

        return {
            monthTotalWorked: worked,
            monthTotalOvertime: overtime,
        };
    }, [punches, config]);

    const updateDate = useCallback(() => {
        setToday(DateTime.now());
    }, []);

    useForeground(updateDate);

    useEffect(() => {
        const now = DateTime.now();
        const startOfNextDay = now.plus({ days: 1 }).startOf('day');

        const timer = setTimeout(
            updateDate,
            startOfNextDay.diff(now).toMillis()
        );

        return () => clearTimeout(timer);
    }, []);

    function handleCalendarDateChange(date: string) {
        setSelectedCalendarDate((prev) =>
            prev && prev === date ? undefined : date
        );
    }

    function getTimeForDate(date: DateTime<true>) {
        const time = workedTimeFromPunches(
            date,
            punches[date.toSQLDate()] || []
        );
        const b = hoursToBeWorked(date, config);

        if (time.toMillis() > b.toMillis()) {
            return `${b.toFormat('hh:mm')} + ${time
                .minus(b)
                .toFormat('hh:mm')}`;
        }

        return time.toFormat('hh:mm');
    }

    return (
        <ScrollView onLayout={() => SplashScreen.hideAsync()}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: `${calculatedMonthRange[0].toLocaleString({
                        month: 'short',
                    })} - ${calculatedMonthRange[1].toLocaleString({
                        month: 'short',
                    })}`,
                    headerLeft: () => (
                        <Button
                            chromeless
                            color="$gray7"
                            px="$3"
                            icon={<CalendarIcon size="$1.5" />}
                        />
                    ),
                    headerRight: () => (
                        <Button
                            onPress={() => setOpenMenu(true)}
                            chromeless
                            px="$3"
                            icon={<MoreVertical size="$1.5" />}
                        />
                    ),
                }}
            />

            <YStack px="$2" pt="$2">
                <PunchesCalendar
                    calendarDayHeight={48}
                    calendarActiveDateRanges={
                        typeof selectedCalendarDate === 'string'
                            ? [
                                  {
                                      startId: selectedCalendarDate,
                                      endId: selectedCalendarDate,
                                  },
                              ]
                            : []
                    }
                    calendarDisabledDateIds={ignoredDates}
                    calendarMinDateId={toDateId(
                        calculatedMonthRange[0].toJSDate()
                    )}
                    calendarMaxDateId={toDateId(
                        calculatedMonthRange[1].toJSDate()
                    )}
                    calendarMonthId={toDateId(startOfThisMonth.toJSDate())}
                    onCalendarDayPress={handleCalendarDateChange}
                />
            </YStack>

            {selectedCalendarDate && (
                <YStack
                    backgroundColor="$background"
                    borderRadius="$5"
                    mt="$4"
                    mx="$4"
                    px="$4"
                    py="$4"
                    gap="$4"
                >
                    <XStack
                        alignItems="baseline"
                        justifyContent="space-between"
                    >
                        <SizableText size="$7">
                            {DateTime.fromJSDate(
                                fromDateId(selectedCalendarDate)
                            ).toLocaleString({
                                localeMatcher: 'lookup',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </SizableText>
                        <SizableText size="$4" color="$gray11">
                            {getTimeForDate(
                                DateTime.fromSQL(
                                    selectedCalendarDate
                                ) as DateTime<true>
                            )}
                        </SizableText>
                    </XStack>
                    <XGroup alignSelf="center">
                        {predictDailyPunches(
                            DateTime.fromSQL(
                                selectedCalendarDate
                            ) as DateTime<true>,
                            punches,
                            config
                        ).map((punch) => {
                            return (
                                <XGroup.Item
                                    key={`${selectedCalendarDate}-${punch.time}}`}
                                >
                                    <Button fontFamily="$tabular">
                                        {!punch.predicted
                                            ? punch.time
                                            : '--:--'}
                                    </Button>
                                </XGroup.Item>
                            );
                        })}
                    </XGroup>
                </YStack>
            )}
            <XStack
                gap="$4"
                px="$4"
                py="$4"
                flexWrap="wrap"
                alignItems="stretch"
            >
                <YStack
                    flexGrow={1}
                    backgroundColor="$background"
                    borderRadius="$6"
                    p="$3"
                >
                    <SizableText size="$5">Hours worked</SizableText>
                    <SizableText size="$8" fontFamily="$tabular">
                        {monthTotalWorked.toFormat('hh:mm')}
                    </SizableText>
                </YStack>
                <YStack
                    flexGrow={1}
                    backgroundColor="$background"
                    borderRadius="$6"
                    p="$3"
                >
                    <SizableText size="$5">Overtime</SizableText>
                    <SizableText size="$8" fontFamily="$tabular">
                        {monthTotalOvertime.toFormat('hh:mm')}
                    </SizableText>
                </YStack>
                <YStack
                    flexGrow={1}
                    backgroundColor="$background"
                    borderRadius="$6"
                    p="$3"
                >
                    <SizableText size="$5">Days worked</SizableText>
                    <SizableText size="$8" fontFamily="$tabular">
                        {Object.keys(punches).length}
                    </SizableText>
                </YStack>
                <YStack
                    flexGrow={1}
                    backgroundColor="$background"
                    borderRadius="$6"
                    p="$3"
                >
                    <SizableText size="$5">How many punches</SizableText>
                    <SizableText size="$8" fontFamily="$tabular">
                        {howManyPunches}
                    </SizableText>
                </YStack>
            </XStack>

            <Menu open={openMenu} onOpenChange={setOpenMenu}>
                <Menu.Item
                    onPress={() => {
                        setOpenManualPunch(true);
                        setOpenMenu(false);
                    }}
                >
                    Add punch
                </Menu.Item>
                <Menu.Item
                    onPress={() => {
                        setOpenMenu(false);
                        router.navigate('/adp-punches');
                    }}
                >
                    List ADP punches
                </Menu.Item>
                {devMode ? (
                    <>
                        <Menu.Item
                            onPress={() => {
                                nuke();
                                setOpenMenu(false);
                            }}
                        >
                            Nuke DB
                        </Menu.Item>
                        <Menu.Item
                            onPress={() => {
                                router.navigate(
                                    '/settings/scheduled-notifications'
                                );
                                setOpenMenu(false);
                            }}
                        >
                            List notifications
                        </Menu.Item>
                    </>
                ) : null}
                <Menu.Item
                    onPress={() => {
                        router.navigate('/settings');
                        setOpenMenu(false);
                    }}
                    onLongPress={() => {
                        setDevMode(!devMode);
                    }}
                >
                    Settings
                </Menu.Item>
            </Menu>
            <ManualPunch
                open={openManualPunch}
                onOpenChange={setOpenManualPunch}
            />
        </ScrollView>
    );
}
