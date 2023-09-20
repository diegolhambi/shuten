import * as Notifications from 'expo-notifications';
import { DateTime } from 'luxon';
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { PunchesMap } from '../app';
import { Punch } from '../types/punch';
import { Weekday } from '../utils/date';
import ConfigContext from './config';

type NotificationManagerContextData = {
    granted: boolean | undefined;
    requestPermission: () => Promise<boolean>;
    scheduleFirstPunch: (punches: PunchesMap) => Promise<void>;
    scheduleNext: (punch: Punch[]) => void;
};

const NotificationContext = createContext<NotificationManagerContextData>(
    {} as NotificationManagerContextData,
);

type Props = {
    children?: React.ReactNode;
};

async function checkPermission() {
    const settings = await Notifications.getPermissionsAsync();

    if (
        settings.ios?.status &&
        settings.ios.status >= Notifications.IosAuthorizationStatus.AUTHORIZED
    ) {
        return true;
    }

    return settings.granted;
}

function registerChannels() {
    Notifications.setNotificationCategoryAsync('punch', [
        {
            identifier: 'punch-now',
            buttonTitle: 'Punch',
        },
    ]);
}

const textNotications = {
    0: {
        title: 'Time to Start Work',
        body: "It's time to start your workday. Please clock in now to begin your shift.",
    },
    1: {
        title: 'Lunch Break',
        body: "It's time for your lunch break. Don't forget to clock out!",
    },
    2: {
        title: 'Back from Lunch',
        body: "Welcome back! Don't forget to clock in to resume your work.",
    },
    3: {
        title: 'End of Workday Reminder',
        body: 'Your workday will end in 10 minutes. Please ensure all tasks are completed and remember to clock out on time.',
    },
    '3_time': {
        title: 'End of Workday',
        body: 'Congratulations, your workday is over! Remember to clock out.',
    },
};

export function NotificationProvider({ children }: Props) {
    const { config } = useContext(ConfigContext);
    const [granted, setGranted] = useState<boolean | undefined>();

    useEffect(() => {
        registerChannels();

        checkPermission().then((result) => {
            setGranted(result);
        });
    }, []);

    useEffect(() => {
        const subscription =
            Notifications.addNotificationResponseReceivedListener(
                (response) => {
                    console.log(response);
                },
            );

        return () => {
            subscription.remove();
        };
    }, []);

    async function requestPermission() {
        if (!granted) {
            await Notifications.requestPermissionsAsync();
            return checkPermission();
        }

        return granted;
    }

    async function scheduleFirstPunch(punches: PunchesMap) {
        if (!granted) {
            return;
        }

        if (!config.hoursToWork) {
            return;
        }

        const today = DateTime.now();

        let iterator = today.plus({ days: 0 });
        for (let index = 0; index < 7; index++) {
            const weekday = iterator.weekday as Weekday;
            if (!config.hoursToWork[weekday].punches.length) {
                iterator = iterator.plus({ days: 1 });
                continue;
            }

            if (punches.get(iterator.toFormat('yyyy-MM-dd'))?.length) {
                iterator = iterator.plus({ days: 1 });
                continue;
            }

            const [hour, minute] =
                config.hoursToWork[weekday].punches[0]!.split(':');

            const notifyTrigger = iterator.set({
                hour: +hour!,
                minute: +minute!,
                second: 0,
                millisecond: 0,
            });

            if (today < notifyTrigger) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        categoryIdentifier: 'punch',
                        ...textNotications[0],
                    },
                    identifier: `punch_${notifyTrigger.toFormat(
                        'yyyy-MM-dd_HH-mm',
                    )}`,
                    trigger: notifyTrigger.toJSDate(),
                });
            }

            iterator = iterator.plus({ days: 1 });
        }
    }

    function scheduleNext(punches: Punch[]) {
        if (!granted) {
            return;
        }

        if (!config) {
            return;
        }

        const index = punches.findIndex((punch) => punch.predicted);

        if (index === -1) {
            return;
        }

        const nextPredicted = punches[index];

        if (typeof nextPredicted === 'undefined') {
            return;
        }

        const [hour, minute] = nextPredicted.time.split(':') as [
            string,
            string,
        ];

        let notifyTrigger = DateTime.now().set({
            hour: +hour,
            minute: +minute,
            second: 0,
            millisecond: 0,
        });

        if (punches.length - 1 === index) {
            notifyTrigger = notifyTrigger.minus({ minutes: 10 });
        }

        Notifications.scheduleNotificationAsync({
            content: {
                categoryIdentifier: 'punch',
                ...textNotications[index as 1 | 2 | 3],
            },
            trigger: notifyTrigger.toJSDate(),
        });
    }

    const contextValue = useMemo(
        () => ({
            granted,
            requestPermission,
            scheduleFirstPunch,
            scheduleNext,
        }),
        [granted, config],
    );

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
}

export default NotificationContext;
