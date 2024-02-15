import { db } from '@/providers/database';
import { Punch, PunchType } from '@/types/punch';
import { DateTime } from 'luxon';
import { create } from 'zustand';

export const usePunchStore = create<PunchStore>((set, get) => ({
    state: 'unloaded',
    punches: {} as Punches,
    load: async (dates) => {
        set({ state: 'loading' });

        const newPunches: Punches = {};

        const result: ResultPunches[] = await db.getAllAsync(
            `SELECT 
                  DATE(date) AS date,
                  strftime('%H:%M', date) AS time,
                  type
              FROM punches
              WHERE date >= ? AND date <= ?`,
            [dates[0].toISODate(), dates[1].toISODate()]
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

        set({ state: 'loaded', punches: newPunches });
    },
    insert: async (dateTime = DateTime.now(), type: PunchType = 'punch') => {
        try {
            await db.runAsync(`INSERT INTO punches VALUES (?, ?);`, [
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
    nuke: async () => {
        await db.runAsync(`DELETE FROM punches;`);
        set((state) => ({
            ...state,
            punches: {},
        }));
    },
}));

type DateRange = [initalDate: DateTime, finalDate: DateTime];
export type Punches = Record<string, Punch[]>;
type DatabaseOperation = 'Inserted' | 'Updated' | 'Duplicate' | 'Deleted';

type PunchStore = {
    state: 'unloaded' | 'loading' | 'loaded';
    punches: Punches;
    load(dates: DateRange): Promise<void>;
    insert(
        dateTime?: DateTime
    ): Promise<Exclude<DatabaseOperation, 'Updated' | 'Deleted'>>;
    nuke(): Promise<void>;
};

type ResultPunches = {
    date: string;
    time: string;
    type: PunchType;
};
