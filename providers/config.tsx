import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState } from 'react';

import { Weekday } from '../utils/date';

export type HoursToWork = {
    punches: string[];
    durations: string[];
};

export type Config = {
    firstDayOfMonth: number;
    hoursToWork: {
        [key in Weekday]: HoursToWork;
    };
    durations: {
        lunch: string;
        maxLunch: string;
        maxShift: string;
        maxWork: string;
    };
};

const defaultConfig: Config = {
    firstDayOfMonth: 16,
    hoursToWork: {
        1: {
            punches: ['07:45', '12:00', '13:10', '16:55'],
            durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
        },
        2: {
            punches: ['07:45', '12:00', '13:10', '16:55'],
            durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
        },
        3: {
            punches: ['07:45', '12:00', '13:10', '16:55'],
            durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
        },
        4: {
            punches: ['07:45', '12:00', '13:10', '16:55'],
            durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
        },
        5: {
            punches: ['07:45', '12:00', '13:10', '16:55'],
            durations: ['PT4H15M', 'PT1H10M', 'PT3H45M'],
        },
        6: { punches: [], durations: [] },
        7: { punches: [], durations: [] },
    },
    durations: {
        lunch: 'PT1H10M',
        maxLunch: 'PT2H',
        maxShift: 'PT6H',
        maxWork: 'PT10H',
    },
};

type ConfigContextData = {
    config: Config;
    load(): Promise<void>;
};

const ConfigContext = createContext<ConfigContextData>({} as ConfigContextData);

type ConfigProviderProps = {
    children?: React.ReactNode;
};

export function ConfigProvider({ children }: ConfigProviderProps) {
    const [config, setConfig] = useState<Config>(defaultConfig);

    async function load() {
        try {
            // TODO: Remove this after testing
            await AsyncStorage.setItem('config', JSON.stringify(defaultConfig));
            const jsonValue = await AsyncStorage.getItem('config');

            if (jsonValue == null) {
                await AsyncStorage.setItem(
                    'config',
                    JSON.stringify(defaultConfig),
                );
                return;
            }

            setConfig(JSON.parse(jsonValue));
        } catch (e) {
            console.log('Cant load the config', e);
        }
    }

    return (
        <ConfigContext.Provider value={{ config, load }}>
            {children}
        </ConfigContext.Provider>
    );
}

export default ConfigContext;
