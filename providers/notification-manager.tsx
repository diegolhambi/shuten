import * as Notifications from 'expo-notifications';
import { DateTime, Duration } from 'luxon';
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
    scheduleNext: (time: string, punch: Punch[]) => void;
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
        title: 'Time to start work',
        body: "It's time to start your workday. Please clock in now to begin your shift.",
    },
    1: {
        title: 'Lunchtime',
        body: "It's time for your lunchtime. Don't forget to clock out!",
    },
    2: {
        title: 'Return from lunch',
        body: "Welcome back! Don't forget to clock in to resume your work.",
    },
    3: {
        title: 'End of work',
        body: 'Congratulations, your workday is over! Remember to clock out.',
    },
};

const textEarlyNotifications = {
    0: {
        title: 'Get ready to start work',
        body: 'Your workday will begin in % minutes.',
    },
    1: {
        title: 'Lunch break reminder',
        body: 'Your lunch break is in % minutes.',
    },
    2: {
        title: 'Returning to work soon',
        body: 'You will be returning from lunch in % minutes.',
    },
    3: {
        title: 'End of workday reminder',
        body: 'Your workday will end in % minutes.',
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

    function schedulePunchNotification(punch: 0 | 1 | 2 | 3, time: DateTime) {
        const notificationConfig = config.notification[punch];

        if (notificationConfig.early) {
            const notifyEarlyTrigger = time.minus({
                minutes: config.notification.howEarly,
            });

            Notifications.scheduleNotificationAsync({
                content: {
                    categoryIdentifier: 'punch',
                    title: textEarlyNotifications[punch].title,
                    body: textEarlyNotifications[punch].body.replace(
                        '%',
                        `${config.notification.howEarly}`,
                    ),
                },
                identifier: `punch_${punch}_${notifyEarlyTrigger.toFormat(
                    'yyyy-MM-dd_HH-mm',
                )}`,
                trigger: notifyEarlyTrigger.toJSDate(),
            });
        }

        if (notificationConfig.onTime) {
            Notifications.scheduleNotificationAsync({
                content: {
                    categoryIdentifier: 'punch',
                    ...textNotications[punch],
                },
                identifier: `punch_${punch}_${time.toFormat(
                    'yyyy-MM-dd_HH-mm',
                )}`,
                trigger: time.toJSDate(),
            });
        }
    }

    async function scheduleFirstPunch(punches: PunchesMap) {
        if (!granted) {
            return;
        }

        if (!config.hoursToWork) {
            return;
        }

        if (!config.notification.activated) {
            return;
        }

        const firstPunchConfig = config.notification[0];

        if (!firstPunchConfig.onTime && !firstPunchConfig.early) {
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
                schedulePunchNotification(0, notifyTrigger);
            }

            iterator = iterator.plus({ days: 1 });
        }
    }

    function scheduleNext(dateTime: string, punches: Punch[]) {
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

        const notifyTrigger = DateTime.fromFormat(
            dateTime,
            'yyyy-LL-dd HH:mm',
        ).set({
            hour: +hour,
            minute: +minute,
            second: 0,
            millisecond: 0,
        });

        schedulePunchNotification(index as 0 | 1 | 2 | 3, notifyTrigger);
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
