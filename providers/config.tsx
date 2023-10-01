import React, { createContext, useEffect, useMemo, useState } from 'react';

import { Weekday } from '../utils/date';
import { storage } from '../utils/storage';

export type HoursToWork = {
    punches: string[];
    durations: string[];
};

type ConfigDuration = {
    lunch: string;
    maxLunch: string;
    maxShift: string;
    maxWork: string;
};

type WhenNotify = {
    onTime: boolean;
    early: boolean;
};

type ConfigNotification = {
    activated: boolean;
    howEarly: number;
    0: WhenNotify;
    1: WhenNotify;
    2: WhenNotify;
    3: WhenNotify;
};

type ConfigAdp = {
    activated: boolean;
    user: string;
    password: string;
};

export type Config = {
    firstDayOfMonth: number;
    hoursToWork: {
        [key in Weekday]: HoursToWork;
    };
    duration: ConfigDuration;
    notification: ConfigNotification;
    adp: ConfigAdp;
};

export const defaultHourToWork: HoursToWork = {
    punches: ['07:45', '12:00', '13:10', '16:55'],
    durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
};

const defaultConfig: Config = {
    firstDayOfMonth: 16,
    hoursToWork: {
        1: { ...defaultHourToWork },
        2: { ...defaultHourToWork },
        3: { ...defaultHourToWork },
        4: { ...defaultHourToWork },
        5: { ...defaultHourToWork },
        6: { punches: [], durations: [] },
        7: { punches: [], durations: [] },
    },
    duration: {
        lunch: 'PT1H10M',
        maxLunch: 'PT2H',
        maxShift: 'PT6H',
        maxWork: 'PT10H',
    },
    notification: {
        activated: false,
        howEarly: 10,
        0: { onTime: true, early: false },
        1: { onTime: true, early: false },
        2: { onTime: true, early: false },
        3: { onTime: true, early: true },
    },
    adp: {
        activated: false,
        user: '',
        password: '',
    },
};

type ConfigContextData = {
    config: Config;
    setConfig: (config: Config) => void;
    load(): Promise<void>;
};

const ConfigContext = createContext<ConfigContextData>({} as ConfigContextData);

type ConfigProviderProps = {
    children?: React.ReactNode;
};

export function ConfigProvider({ children }: ConfigProviderProps) {
    const [config, setConfig] = useState<Config>(defaultConfig);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        //storage.set('config', JSON.stringify(defaultConfig));
        try {
            const jsonValue = storage.getString('config');

            if (!jsonValue) {
                storage.set('config', JSON.stringify(defaultConfig));
                return;
            }

            setConfig(JSON.parse(jsonValue));
        } catch (e) {
            console.log('Cant load the config', e);
        }
    }

    function updateConfig(newConfig: Config) {
        setConfig(newConfig);
        storage.set('config', JSON.stringify(newConfig));
    }

    const contextValue = useMemo(
        () => ({ config, setConfig: updateConfig, load }),
        [config],
    );

    return (
        <ConfigContext.Provider value={contextValue}>
            {children}
        </ConfigContext.Provider>
    );
}

export default ConfigContext;
