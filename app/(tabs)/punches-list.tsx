import { MoreVertical } from '@tamagui/lucide-icons';
import { useToastController } from '@tamagui/toast';
import { Stack, router, useFocusEffect } from 'expo-router';
import { DateTime } from 'luxon';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Button, View } from 'tamagui';
import Menu from '@/components/menu';
import PunchItem from '@/components/punch-item';
import AdpContext from '@/providers/adp';
import ConfigContext from '@/providers/config';
import DatabaseContext from '@/providers/database';
import NotificationContext from '@/providers/notification-manager';
import { Punch, PunchType } from '@/types/punch';
import { Weekday } from '@/utils/date';
import {
    days,
    getDayPunches,
    indexToday,
    monthDaysRange,
} from '@/utils/punch-list';

const PUNCHES = new Map<string, Punch[]>();
export type PunchesMap = typeof PUNCHES;

export default function PunchesList() {
    const { config } = useContext(ConfigContext);
    const { db } = useContext(DatabaseContext);
    const adp = useContext(AdpContext);
    const notification = useContext(NotificationContext);
    const toast = useToastController();

    const [today, setToday] = useState(DateTime.now());
    const [todayIso, setTodayIso] = useState(
        DateTime.now().toISODate() as string
    );
    const [fetchedPunches, setFetchedPunches] = useState(0);
    const [openMenu, setOpenMenu] = useState(false);
    const [devMode, setDevMode] = useState(__DEV__);
    const [devDate, setDevDate] = useState<string | undefined>(undefined);

    const data = useMemo(
        () => days(config.firstDayOfMonth),
        [JSON.stringify(config)]
    );
    const initialIndex = useMemo(() => {
        const index = indexToday(config.firstDayOfMonth) - 3;

        return index < 0 ? 0 : index;
    }, [JSON.stringify(config), DateTime.now().toISODate()]);

    const dates = useMemo(
        () => monthDaysRange(config.firstDayOfMonth),
        [DateTime.now().toISODate()]
    );

    console.log(dates);

    useEffect(() => {
        const timer = setInterval(() => {
            setToday(DateTime.now());
            setTodayIso(DateTime.now().toISODate() as string);
        }, 21600000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (devMode === false) {
            setDevDate(undefined);
            return;
        }

        setDevDate(DateTime.now().toFormat('yyyy-MM-dd HH:mm'));
    }, [devMode]);

    useFocusEffect(
        useCallback(() => {
            if (fetchedPunches === 0) {
                return;
            }

            notification.requestPermission().then((granted) => {
                if (!granted || __DEV__) {
                    console.log('not scheduling first punch notification');
                    return;
                }

                notification.scheduleFirstPunch(PUNCHES);
            });
        }, [fetchedPunches])
    );

    useEffect(() => {
        setFetchedPunches(DateTime.now().toMillis());
    }, [JSON.stringify(config)]);

    useEffect(() => {
        databasePunches();
    }, []);

    const getPunches = useCallback(getDayPunches(PUNCHES, config), [
        JSON.stringify(config),
        fetchedPunches,
    ]);

    function renderItem({ item }: { item: string }) {
        return (
            <PunchItem
                day={item}
                today={todayIso}
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
            length: 88,
            offset: 88 * index,
            index,
        };
    }

    const bgButtonPunch = useMemo(() => {
        if (
            config.hoursToWork[today.weekday as Weekday]?.punches.length === 0
        ) {
            return '$gray8';
        }

        if (fetchedPunches === 0) {
            return '$gray8';
        }

        const punches = PUNCHES.get(today.toFormat('yyyy-LL-dd')) || [];

        if (punches.length % 2 === 0) {
            return '$red8';
        }

        return '$green8';
    }, [fetchedPunches, config]);

    async function databasePunches() {
        PUNCHES.clear();

        const result: Array<{
            date: string;
            time: string;
            type: PunchType;
        }> = await db.getAllAsync(
            `select 
                  DATE(date) as date,
                  strftime('%H:%M', date) as time,
                  type
              from punches`
        );

        for (const item of result) {
            if (PUNCHES.has(item.date)) {
                const old = PUNCHES.get(item.date) || [];
                old.push({ time: item.time, type: item.type });
                PUNCHES.set(item.date, old);
                continue;
            }

            PUNCHES.set(item.date, [{ time: item.time, type: item.type }]);
        }

        setFetchedPunches(DateTime.now().toMillis());
    }

    async function insertPunch(dateTime?: string) {
        const value = dateTime || DateTime.now().toFormat('yyyy-LL-dd HH:mm');

        try {
            await db.runAsync(`INSERT INTO punches VALUES (?, 'punch');`, [
                value,
            ]);

            await databasePunches();

            notification.scheduleNext(value, getPunches(value.split(' ')[0]!));
        } catch (error: any) {
            if (
                error.message.includes('UNIQUE constraint failed: punches.date')
            ) {
                toast.show('Duplicate entry detected', {
                    message: "You've already added a punch at this time.",
                });
            } else {
                toast.show('Something went wrong', {
                    message: error.message,
                });
            }
        }
    }

    return (
        <View flex={1} bg="$backgroundStrong">
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: `${dates[0].toLocaleString({
                        month: 'short',
                    })} - ${dates[1].toLocaleString({ month: 'short' })}`,
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
            {/* <BottomBar>
                <XStack flexGrow={1} />
                {devMode ? (
                    <XStack gap="$1" alignItems="center" flexShrink={1}>
                        <Button
                            size="$2"
                            icon={<ClockIcon />}
                            onPress={() =>
                                setDevDate(
                                    DateTime.now().toFormat('yyyy-MM-dd HH:mm')
                                )
                            }
                        />
                        <Input
                            placeholder="yyyy-LL-dd HH:mm"
                            value={devDate}
                            onChangeText={(text) => setDevDate(text)}
                        />
                    </XStack>
                ) : null}
                <PunchButton
                    onPressIn={() => {
                        if (Platform.OS === 'android') {
                            Vibration.vibrate([10, 5], true);
                        }
                    }}
                    onPressOut={() => {
                        if (Platform.OS === 'android') {
                            Vibration.cancel();
                        }
                    }}
                    onLongPress={() => {
                        Vibration.cancel();
                        Vibration.vibrate(450, false);

                        insertPunch(devDate || undefined);
                        if (!devMode && config.adp.activated) {
                            adp.punch();
                        }
                    }}
                    backgroundColor={bgButtonPunch}
                />
            </BottomBar> */}
            <Menu open={openMenu} onOpenChange={setOpenMenu}>
                <Menu.Item
                    onPress={() => {
                        toast.show('To do');
                        insertPunch('2024-02-09 07:45');
                        insertPunch('2024-02-09 12:00');
                        insertPunch('2024-02-09 13:10');
                        insertPunch('2024-02-09 16:45');
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
                                db.runAsync('DELETE FROM punches');
                                databasePunches();
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
        </View>
    );
}
