import * as Notifications from 'expo-notifications';
import { DateTime } from 'luxon';
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Punch } from '../types/punch';
import ConfigContext from './config';

type NotificationManagerContextData = {
    granted: boolean | undefined;
    requestPermission: () => Promise<boolean>;
    scheduleFirstPunch: () => void;
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

    function scheduleFirstPunch() {
        if (!granted) {
            return;
        }

        if (!config.hoursToWork) {
            return;
        }

        for (const key in config.hoursToWork) {
            if (config.hoursToWork.hasOwnProperty(key)) {
                const element = config.hoursToWork[key] || {
                    punches: [] as string[],
                    durations: [] as string[],
                };

                if (element.punches.length === 0) {
                    continue;
                }

                const [hour, minute] = (element.punches[0] as string).split(
                    ':',
                ) as [string, string];

                Notifications.scheduleNotificationAsync({
                    content: {
                        categoryIdentifier: 'punch',
                        ...textNotications[0],
                    },
                    trigger: {
                        repeats: true,
                        weekday: +key,
                        hour: +hour,
                        minute: +minute,
                    },
                });
            }
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
