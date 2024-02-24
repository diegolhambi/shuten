import * as Notifications from 'expo-notifications';
import { DateTime } from 'luxon';
import React, { createContext, useEffect, useMemo, useState } from 'react';

import { Punches, usePunchStore } from '@/providers/punches';
import { Punch, PunchType } from '@/types/punch';
import { Weekday } from '@/utils/date';
import { predictDailyPunches } from '@/utils/punch-list';
import { DeviceEventEmitter } from 'react-native';
import { useConfig } from './config';

export function NotificationProvider({ children }: Props) {
    const { config } = useConfig();
    const { punches } = usePunchStore();
    const [granted, setGranted] = useState<boolean | undefined>();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(
            'punch-inserted',
            (punch: { dateTime: DateTime; type: PunchType }) => {
                scheduleNext(
                    punch.dateTime,
                    predictDailyPunches(punch.dateTime, punches, config)
                );
            }
        );

        return () => {
            listener.remove();
        };
    }, [granted, punches, config]);

    useEffect(() => {
        registerChannels();

        checkPermission().then((result) => {
            setGranted(result);
        });
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

            const message =
                textEarlyNotifications[punch][
                    Math.random() * (textEarlyNotifications[punch].length - 1)
                ];

            Notifications.scheduleNotificationAsync({
                content: {
                    categoryIdentifier: 'punch',
                    title: message.title,
                    body: message.body.replace(
                        '%',
                        `${config.notification.howEarly}`
                    ),
                },
                identifier: `punch_${punch}_${notifyEarlyTrigger.toFormat(
                    'yyyy-MM-dd_HH-mm'
                )}`,
                trigger: notifyEarlyTrigger.toJSDate(),
            });
        }

        if (notificationConfig.onTime) {
            Notifications.scheduleNotificationAsync({
                content: {
                    categoryIdentifier: 'punch',
                    ...textNotications[punch][
                        Math.random() * (textNotications[punch].length - 1)
                    ],
                },
                identifier: `punch_${punch}_${time.toFormat(
                    'yyyy-MM-dd_HH-mm'
                )}`,
                trigger: time.toJSDate(),
            });
        }
    }

    async function scheduleFirstPunch(punches: Punches) {
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

            if (punches[iterator.toFormat('yyyy-MM-dd')]?.length) {
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

    function scheduleNext(dateTime: DateTime, punches: Punch[]) {
        if (!granted) {
            return;
        }

        if (!config) {
            return;
        }

        const index = punches.findIndex((punch) => punch.predicted);

        Notifications.dismissAllNotificationsAsync();

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

        const notifyTrigger = dateTime.set({
            hour: +hour,
            minute: +minute,
            second: 0,
            millisecond: 0,
        });

        Notifications.getAllScheduledNotificationsAsync().then(
            (notifications) => {
                const identifier = dateTime.toFormat('yyyy-MM-dd');

                notifications.forEach((notification) => {
                    if (notification.identifier.includes(identifier)) {
                        Notifications.cancelScheduledNotificationAsync(
                            notification.identifier
                        );
                    }
                });
            }
        );

        schedulePunchNotification(index as 0 | 1 | 2 | 3, notifyTrigger);
    }

    const contextValue = useMemo(
        () => ({
            granted,
            requestPermission,
            scheduleFirstPunch,
            scheduleNext,
        }),
        [granted, config]
    );

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return React.useContext(NotificationContext);
}

type NotificationManagerContextData = {
    granted: boolean | undefined;
    requestPermission: () => Promise<boolean>;
    scheduleFirstPunch: (punches: Punches) => Promise<void>;
    scheduleNext: (dateTime: DateTime, punch: Punch[]) => void;
};

const NotificationContext = createContext<NotificationManagerContextData>(
    {} as NotificationManagerContextData
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

type TextNotification = {
    [key in 0 | 1 | 2 | 3]: {
        title: string;
        body: string;
    }[];
};

const textNotications: TextNotification = {
    0: [
        {
            title: 'Time to start work',
            body: "It's time to start your workday. Please clock in now to begin your shift.",
        },
        { title: 'Workday begins!', body: "Let's conquer the day!" },
        { title: 'Time to shine!', body: 'Clock in and get productive.' },
        { title: 'Your journey starts!', body: 'Start your day with a win.' },
        { title: 'Good morning!', body: 'Time to kick off your workday! ' },
        {
            title: "Let's get down to business!",
            body: 'Clock in and conquer your goals.',
        },
        {
            title: 'Rise and shine!',
            body: 'A new day, new opportunities. Seize them!',
        },
    ],
    1: [
        {
            title: 'Lunchtime',
            body: "It's time for your lunchtime. Don't forget to clock out!",
        },
        { title: 'Lunch break!', body: 'Recharge and refuel!' },
        { title: 'Time to eat!', body: "Don't forget to clock out." },
        { title: 'Midday break!', body: 'Enjoy your well-deserved rest.' },
        {
            title: 'Lunchtime is calling!',
            body: 'Fuel up and recharge for the afternoon.',
        },
        {
            title: 'Treat yourself to a break!',
            body: "It's time to step away and refresh.",
        },
        {
            title: 'Time to refuel!',
            body: "Don't forget to clock out and enjoy your lunch!",
        },
    ],
    2: [
        {
            title: 'Return from lunch',
            body: "Welcome back! Don't forget to clock in to resume your work.",
        },
        { title: 'Back to work!', body: "Let's finish strong!" },
        { title: 'Time to focus!', body: 'Clock in and power through.' },
        { title: 'Final push!', body: 'Almost there, keep going!' },
        {
            title: 'Back to work!',
            body: "Let's make the most of the remaining hours.",
        },
        {
            title: 'Final stretch!',
            body: 'Finish strong and achieve your targets!',
        },
        {
            title: 'Time to power through!',
            body: 'Clock in and give it your all!',
        },
    ],
    3: [
        {
            title: 'End of work',
            body: 'Congratulations, your workday is over! Remember to clock out.',
        },
        { title: 'Workday done!', body: 'Time to relax and unwind!' },
        { title: 'You did it!', body: 'Clock out and enjoy your time.' },
        { title: 'Cheers to freedom!', body: 'Your workday is over!' },
        { title: 'Congratulations!', body: "You've completed your workday! " },
        {
            title: 'Time to clock out!',
            body: 'Enjoy your well-deserved rest and relaxation.',
        },
        {
            title: 'Freedom at last!',
            body: 'Go forth and conquer your free time!',
        },
    ],
};

const textEarlyNotifications: TextNotification = {
    0: [
        {
            title: 'Get ready to start work',
            body: 'Your workday will begin in % minutes.',
        },
        { title: 'Work starts soon!', body: 'Get ready in % mins.' },
        {
            title: 'Almost time to work!',
            body: 'Prepare for a productive day.',
        },
        { title: 'Your workday awaits!', body: 'Clock in in % mins.' },
        {
            title: 'Heads up!',
            body: 'Your workday starts in % mins. Get ready!',
        },
        {
            title: 'The clock is ticking!',
            body: 'Prepare for a productive day in % mins.',
        },
        {
            title: 'Your journey begins soon!',
            body: 'Get set for your workday in % mins.',
        },
    ],
    1: [
        {
            title: 'Lunch break reminder',
            body: 'Your lunch break is in % minutes.',
        },
        { title: 'Lunch break in % mins!', body: 'Pack your delicious meal.' },
        { title: 'Get ready to refuel!', body: 'Lunchtime is almost here.' },
        {
            title: 'Food break coming up!',
            body: "Don't forget your lunch in % mins.",
        },
        {
            title: 'Lunch break alert!',
            body: "It's almost time to refuel in % mins.",
        },
        {
            title: 'Get ready to eat!',
            body: 'Pack your lunch and prepare for a break in % mins.',
        },
        {
            title: 'Food break approaching!',
            body: "Don't forget your delicious meal in % mins.",
        },
    ],
    2: [
        {
            title: 'Returning to work soon',
            body: 'You will be returning from lunch in % minutes.',
        },
        { title: 'Back from lunch in % mins!', body: 'Make the most of it!' },
        { title: 'Time to resume work!', body: 'Clock in after your break.' },
        { title: 'Lunch break is over!', body: 'Back to work in % mins.' },
        {
            title: 'Time to return!',
            body: 'Your lunch break ends in % mins. Clock in soon!',
        },
        {
            title: 'Back to work reminder!',
            body: 'Get ready to resume your tasks in % mins.',
        },
        {
            title: 'Break over!',
            body: "It's time to clock in and continue in % mins.",
        },
    ],
    3: [
        {
            title: 'End of workday reminder',
            body: 'Your workday will end in % minutes.',
        },
        { title: 'Work ends in % mins!', body: 'Wrap it up and relax!' },
        {
            title: 'Almost done for the day!',
            body: 'Finish those tasks in % mins.',
        },
        {
            title: 'Your workday is almost over!',
            body: 'Get ready to enjoy your free time in % mins.',
        },
        {
            title: 'Almost there!',
            body: 'Your workday ends in % mins. Finish strong!',
        },
        {
            title: 'Wrapping it up!',
            body: 'Get those last tasks done in % mins.',
        },
        {
            title: 'Time to celebrate!',
            body: 'Your workday is almost over in % mins.',
        },
    ],
};
