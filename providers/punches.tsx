import { db } from '@/providers/database';
import { Punch, PunchType } from '@/types/punch';
import { DateTime } from 'luxon';
import { create } from 'zustand';

export const usePunchStore = create<PunchStore>((set, get) => ({
    state: 'unloaded',
    punches: new Map<string, Punch[]>(),
    load: async (dates) => {
        set({ state: 'loading' });

        const newPunches: PunchesMap = new Map();

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
            if (newPunches.has(item.date)) {
                const old = newPunches.get(item.date) || [];
                old.push({ time: item.time, type: item.type });
                newPunches.set(item.date, old);
                continue;
            }

            newPunches.set(item.date, [{ time: item.time, type: item.type }]);
        }

        set({ state: 'loaded', punches: newPunches });
    },
    insert: async (dateTime = DateTime.now()) => {
        try {
            await db.runAsync(`INSERT INTO punches VALUES (?, 'punch');`, [
                dateTime.toFormat('yyyy-LL-dd HH:mm'),
            ]);

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
}));

type DateRange = [initalDate: DateTime, finalDate: DateTime];
type PunchesMap = Map<string, Punch[]>;
type DatabaseOperation = 'Inserted' | 'Updated' | 'Duplicate' | 'Deleted';

type PunchStore = {
    state: 'unloaded' | 'loading' | 'loaded';
    punches: Map<string, Punch[]>;
    load(dates: DateRange): Promise<void>;
    insert(
        dateTime?: DateTime
    ): Promise<Exclude<DatabaseOperation, 'Updated' | 'Deleted'>>;
};

type ResultPunches = {
    date: string;
    time: string;
    type: PunchType;
};
