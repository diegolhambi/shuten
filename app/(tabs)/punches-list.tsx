import { ManualPunch } from '@/components/manual-punch';
import Menu from '@/components/menu';
import PunchItem from '@/components/punch-item';
import { useConfig } from '@/providers/config';
import { usePunchStore } from '@/providers/punches';
import { useForeground } from '@/utils/app-state';
import {
    days,
    getDailyPunches,
    indexToday,
    monthDaysRange,
} from '@/utils/punch-list';
import { Calendar, MoreVertical } from '@tamagui/lucide-icons';
import { Stack, router } from 'expo-router';
import { DateTime } from 'luxon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Button, View } from 'tamagui';

export default function PunchesList() {
    const [today, setToday] = useState(DateTime.now());

    const [fetchedPunches, setFetchedPunches] = useState(0);

    const [openMenu, setOpenMenu] = useState(false);
    const [openManualPunch, setOpenManualPunch] = useState(false);

    const [devMode, setDevMode] = useState(__DEV__);

    const { config } = useConfig();
    const { punches, nuke } = usePunchStore();

    const data = useMemo(
        () => days(config.firstDayOfMonth),
        [JSON.stringify(config)]
    );

    const initialIndex = useMemo(() => {
        const index = indexToday(config.firstDayOfMonth) - 3;

        return index < 0 ? 0 : index;
    }, [JSON.stringify(config), today]);

    const dates = useMemo(
        () => monthDaysRange(config.firstDayOfMonth),
        [today]
    );

    useEffect(() => {
        setFetchedPunches((prev) => prev + 1);
    }, [punches]);

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

    const getPunches = useCallback(getDailyPunches(punches, config), [
        punches,
        JSON.stringify(config),
    ]);

    function renderItem({ item }: { item: string }) {
        return (
            <PunchItem
                day={item}
                today={today}
                fetchedPunches={fetchedPunches}
                getPunches={getPunches}
            />
        );
    }

    function keyExtractor(item: string) {
        return `punch-${item}`;
    }

    function getItemLayout(_: any, index: number) {
        return {
            length: 71,
            offset: 71 * index,
            index,
        };
    }

    return (
        <View flex={1} bg="$backgroundStrong">
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: `${dates[0].toLocaleString({
                        month: 'short',
                    })} - ${dates[1].toLocaleString({ month: 'short' })}`,
                    headerLeft: () => (
                        <Button
                            chromeless
                            color="$gray7"
                            px="$3"
                            icon={<Calendar size="$1.5" />}
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

            <FlatList
                data={data}
                initialNumToRender={15}
                initialScrollIndex={initialIndex}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
            />

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
                        router.push('/adp-punches');
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
                                router.push(
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
                        router.push('/settings');
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
        </View>
    );
}
