import { Clock, MailCheck, MoreVertical } from '@tamagui/lucide-icons';
import { useToastController } from '@tamagui/toast';
import * as NavigationBar from 'expo-navigation-bar';
import { router, SplashScreen, useFocusEffect } from 'expo-router';
import { ResultSet, SQLError } from 'expo-sqlite';
import * as SystemUI from 'expo-system-ui';
import { DateTime } from 'luxon';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, styled, useTheme, XStack } from 'tamagui';

import { BottomBar } from '../components/bottom-bar';
import Date from '../components/clock';
import Menu from '../components/menu';
import { PunchButton } from '../components/punch-button';
import PunchItem from '../components/punch-item';
import AdpContext from '../providers/adp';
import ConfigContext from '../providers/config';
import DatabaseContext from '../providers/database';
import NotificationContext from '../providers/notification-manager';
import { Punch } from '../types/punch';
import { Weekday } from '../utils/date';
import { days, getDayPunches, indexToday } from '../utils/punch-list';

const PUNCHES = new Map<string, Punch[]>();
export type PunchesMap = typeof PUNCHES;

const AreaView = styled(SafeAreaView, {
    name: 'HomeAreaView',
    flex: 1,
    edges: ['top', 'right', 'left'],
    backgroundColor: '$backgroundStrong',
});

const BottomAreaView = styled(SafeAreaView, {
    name: 'HomeBottomAreaView',
    edges: ['bottom'],
    backgroundColor: '$backgroundHover',
});

export default function Home() {
    const theme = useTheme();
    const { config } = useContext(ConfigContext);
    const { db } = useContext(DatabaseContext);
    const adp = useContext(AdpContext);
    const notification = useContext(NotificationContext);
    const toast = useToastController();

    const [today, setToday] = useState(DateTime.now());
    const [todayIso, setTodayIso] = useState(
        DateTime.now().toISODate() as string,
    );
    const [fetchedPunches, setFetchedPunches] = useState(0);
    const [openMenu, setOpenMenu] = useState(false);
    const [devMode, setDevMode] = useState(__DEV__);
    const [devDate, setDevDate] = useState<string | undefined>(undefined);

    const data = useMemo(
        () => days(config.firstDayOfMonth),
        [JSON.stringify(config)],
    );
    const initialIndex = useMemo(() => {
        const index = indexToday(config.firstDayOfMonth) - 3;

        return index < 0 ? 0 : index;
    }, [JSON.stringify(config)]);

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
        }, [fetchedPunches]),
    );

    useFocusEffect(
        useCallback(() => {
            SystemUI.setBackgroundColorAsync(theme.background.val);

            if (Platform.OS !== 'android') {
                return;
            }

            NavigationBar.setBackgroundColorAsync(theme.backgroundHover.val);
        }, []),
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
            length: 87,
            offset: 87 * index,
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

        return db.transactionAsync(async (tx) => {
            const result = (await tx.executeSqlAsync(
                `select 
                    DATE(date) as date,
                    strftime('%H:%M', date) as time,
                    type
                from punches`,
            )) as ResultSet;

            for (const item of result.rows) {
                if (PUNCHES.has(item.date)) {
                    const old = PUNCHES.get(item.date) || [];
                    old.push({ time: item.time, type: item.type });
                    PUNCHES.set(item.date, old);
                    continue;
                }

                PUNCHES.set(item.date, [{ time: item.time, type: item.type }]);
            }

            setFetchedPunches(DateTime.now().toMillis());
        }, true);
    }

    async function insertPunch(dateTime?: string) {
        const value = dateTime || DateTime.now().toFormat('yyyy-LL-dd HH:mm');

        db.transaction(
            (tx) => {
                tx.executeSql("INSERT INTO punches VALUES (?, 'punch');", [
                    value,
                ]);
            },
            (error: SQLError) => {
                if (
                    error.message.includes(
                        'UNIQUE constraint failed: punches.date',
                    )
                ) {
                    toast.show('Duplicate entry detected', {
                        message: "You've already added a punch at this time.",
                    });
                } else {
                    toast.show('Something went wrong', {
                        message: error.message,
                    });
                }
            },
            async () => {
                await databasePunches();

                notification.scheduleNext(
                    value,
                    getPunches(value.split(' ')[0]!),
                );
            },
        );
    }

    return (
        <AreaView onLayout={() => SplashScreen.hideAsync()}>
            <FlatList
                data={data}
                initialNumToRender={15}
                initialScrollIndex={initialIndex}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
            />
            <BottomBar>
                <XStack flexGrow={1}>
                    <Button
                        onPress={() => setOpenMenu(true)}
                        chromeless
                        px="$3"
                        icon={<MoreVertical size="$1.5" />}
                    />
                </XStack>
                {devMode ? (
                    <XStack
                        space="$1"
                        alignItems="center"
                        flexShrink={1}
                    >
                        <Button
                            size="$2"
                            icon={<MailCheck />}
                            onPress={() => {
                                adp.test();
                                //toast.show('Not implemented yet');
                            }}
                        />
                        <Button
                            size="$2"
                            icon={<Clock />}
                            onPress={() =>
                                setDevDate(
                                    DateTime.now().toFormat('yyyy-MM-dd HH:mm'),
                                )
                            }
                        />
                        <Input
                            placeholder="yyyy-LL-dd HH:mm"
                            value={devDate}
                            onChangeText={(text) => setDevDate(text)}
                        />
                    </XStack>
                ) : (
                    <Date />
                )}
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
            </BottomBar>
            <BottomAreaView />
            <Menu
                open={openMenu}
                onOpenChange={setOpenMenu}
            >
                <Menu.Item
                    onPress={() => {
                        toast.show('To do');
                    }}
                >
                    Add punch
                </Menu.Item>
                {devMode ? (
                    <Menu.Item
                        onPress={() => {
                            db.transaction((tx) =>
                                tx.executeSql('DELETE FROM punches'),
                            );
                            databasePunches();
                        }}
                    >
                        Nuke DB
                    </Menu.Item>
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
        </AreaView>
    );
}
