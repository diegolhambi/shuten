import { db } from '@/providers/database';
import { Punch, PunchType } from '@/types/punch';
import { DateTime } from 'luxon';
import { create } from 'zustand';
import { DeviceEventEmitter } from 'react-native';

export const usePunchStore = create<PunchStore>((set, get) => ({
    state: 'Unloaded',
    punches: {} as Punches,
    load: async (dates) => {
        set({ state: 'Loading' });

        const newPunches: Punches = {};

        const result: ResultPunches[] = await db.getAllAsync(
            `SELECT 
                  DATE(date) AS date,
                  strftime('%H:%M', date) AS time,
                  type
              FROM punches
              WHERE date >= ? AND date <= ?`,
            [dates[0].toSQL(), dates[1].toSQL()]
        );

        for (const item of result) {
            if (newPunches[item.date]) {
                newPunches[item.date].push({
                    time: item.time,
                    type: item.type,
                });
            } else {
                newPunches[item.date] = [{ time: item.time, type: item.type }];
            }
        }

        set({ state: 'Loaded', punches: newPunches });
    },
    insert: async (dateTime = DateTime.now(), type: PunchType = 'punch') => {
        try {
            await db.runAsync('INSERT INTO punches VALUES (?, ?);', [
                dateTime.toFormat('yyyy-LL-dd HH:mm'),
                type,
            ]);

            const newPunches = { ...get().punches };

            const date = dateTime.toISODate() as string;
            const time = dateTime.toFormat('HH:mm') as string;

            if (newPunches[date]) {
                newPunches[date].push({
                    time: time,
                    type: type,
                });
            } else {
                newPunches[date] = [{ time: time, type: type }];
            }

            set((state) => ({
                ...state,
                punches: newPunches,
            }));

            DeviceEventEmitter.emit('punch-inserted', {
                dateTime,
                type,
            });

            return 'Inserted';
        } catch (error: any) {
            if (
                error.message.includes('UNIQUE constraint failed: punches.date')
            ) {
                return 'Duplicate';
            }

            throw error;
        }
    },
    remove: async (dateTime) => {
        try {
            await db.runAsync('DELETE FROM punches WHERE date = ?;', [
                dateTime.toFormat('yyyy-LL-dd HH:mm'),
            ]);

            const date = dateTime.toISODate() as string;
            const time = dateTime.toFormat('HH:mm') as string;

            const newPunches = { ...get().punches };

            if (newPunches[date]) {
                newPunches[date] = newPunches[date].filter(
                    (punch) => punch.time !== time
                );
            }

            set((state) => ({
                ...state,
                punches: newPunches,
            }));

            return 'Deleted';
        } catch (error) {
            throw error;
        }
    },
    nuke: async () => {
        await db.runAsync('DELETE FROM punches;');
        set((state) => ({
            ...state,
            punches: {},
        }));
    },
}));

type DateRange = [initalDate: DateTime, finalDate: DateTime];
export type Punches = Record<string, Punch[]>;
type PunchStoreState = 'Unloaded' | 'Loading' | 'Loaded';
type DatabaseOperation = 'Inserted' | 'Updated' | 'Duplicate' | 'Deleted';

type PunchStore = {
    state: PunchStoreState;
    punches: Punches;
    load(dates: DateRange): Promise<void>;
    insert(
        dateTime?: DateTime
    ): Promise<Exclude<DatabaseOperation, 'Updated' | 'Deleted'>>;
    remove(
        dateTime: DateTime
    ): Promise<Exclude<DatabaseOperation, 'Updated' | 'Inserted'>>;
    nuke(): Promise<void>;
};

type ResultPunches = {
    date: string;
    time: string;
    type: PunchType;
};
