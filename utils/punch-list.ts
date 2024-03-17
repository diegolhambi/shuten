import { DateTime, Duration } from 'luxon';

import type { Config } from '@/providers/config';
import type { Punch } from '@/types/punch';
import type { Weekday } from './date';
import type { Punches } from '@/providers/punches';

export function monthDaysRange(
    firstDay: number
): [initialDate: DateTime, finalDate: DateTime] {
    const today = DateTime.now();

    let initalDate: DateTime;
    let finalDate: DateTime;

    if (today.day >= firstDay) {
        initalDate = today.set({ day: firstDay });
        finalDate = initalDate.plus({ days: 30 });
    } else {
        initalDate = today.minus({ month: 1 }).set({ day: firstDay });
        finalDate = initalDate.plus({ days: 30 });
    }

    return [
        initalDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
        finalDate.set({
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
        }),
    ];
}

export function days(firstDay: number): string[] {
    const [initalDate, finalDate] = monthDaysRange(firstDay);

    const diff = finalDate.diff(initalDate, 'days').days;

    const days: string[] = [];

    for (let i = 0; i <= diff; i++) {
        const date = initalDate.plus({ days: i });

        days.push(date.toISODate() as string);
    }

    return days;
}

export function indexToday(firstDay: number): number {
    const [initialDate] = monthDaysRange(firstDay);

    return DateTime.now().diff(initialDate, 'days').days;
}

export function getDailyPunches(punches: Punches, config: Config) {
    return (day: string): Punch[] => {
        const listPunches = punches[day] || [];

        const date = DateTime.fromISO(day) as DateTime<true>;

        if (!date.hasSame(DateTime.now(), 'day')) {
            return listPunches;
        }

        return predictDailyPunches(date, punches, config);
    };
}

export function predictDailyPunches(
    day: DateTime<true>,
    dbPunches: Punches,
    config: Config
): Punch[] {
    const listPunches = dbPunches[day.toSQLDate()] || [];

    const configHours = config.hoursToWork[day.weekday as Weekday] || {
        punches: [],
        durations: [],
    };

    if (
        listPunches.length === 0 &&
        configHours.punches.length === 0 &&
        [6, 7].indexOf(day.weekday) !== -1
    ) {
        return [{ time: '00:00', type: 'weekend', predicted: true }];
    }

    if (
        listPunches.length === 0 &&
        configHours.punches.length === 0 &&
        [1, 2, 3, 4, 5].indexOf(day.weekday) !== -1
    ) {
        return [{ time: '00:00', type: 'nonWorkingDay', predicted: true }];
    }

    if (
        listPunches.length >= 4 ||
        listPunches.some((item: Punch) => item.type !== 'punch')
    ) {
        return listPunches;
    }

    if (configHours.punches.length === 0 && listPunches.length > 0) {
        return listPunches;
    }

    const firstPeriod = Duration.fromISO(configHours.durations[0] as string);
    const lunchPeriod = Duration.fromISO(configHours.durations[1] as string);
    const secondPeriod = Duration.fromISO(
        configHours.durations[configHours.durations.length - 1] as string
    );

    const workDuration = firstPeriod.plus(secondPeriod);

    const calculatedPunches: Punch[] = [];

    for (let index = 0; index < configHours.punches.length; index++) {
        const element = configHours.punches[index];

        if (listPunches[index]) {
            calculatedPunches.push(listPunches[index] as Punch);
            continue;
        }

        if (index === 2 && listPunches.at(index - 1)) {
            calculatedPunches.push({
                type: 'punch',
                time: DateTime.fromFormat(
                    (listPunches[index - 1] as Punch).time,
                    'HH:mm'
                )
                    .plus(lunchPeriod)
                    .toFormat('HH:mm'),
                predicted: true,
            });
            continue;
        }

        if (index === 3 && listPunches.at(2)) {
            const enter = DateTime.fromFormat(
                (listPunches[0] as Punch).time,
                'HH:mm'
            );
            const lunchOut = DateTime.fromFormat(
                (listPunches[1] as Punch).time,
                'HH:mm'
            );
            const lunchIn = DateTime.fromFormat(
                (listPunches[2] as Punch).time,
                'HH:mm'
            );

            calculatedPunches.push({
                type: 'punch',
                time: lunchIn
                    .plus(workDuration.minus(lunchOut.diff(enter)))
                    .toFormat('HH:mm'),
                predicted: true,
            });
            continue;
        }

        if (index === 3 && listPunches.at(0)) {
            calculatedPunches.push({
                type: 'punch',
                time: DateTime.fromFormat(
                    (listPunches[0] as Punch).time,
                    'HH:mm'
                )
                    .plus(workDuration)
                    .plus(lunchPeriod)
                    .toFormat('HH:mm'),
                predicted: true,
            });
            continue;
        }

        calculatedPunches.push({
            type: 'punch',
            time: element as string,
            predicted: true,
        });
    }

    return calculatedPunches;
}

export function workedTimeFromPunches(
    date: DateTime<true>,
    punches: Punch[]
): Duration<true> {
    const startTimes = punches
        .filter((_, index) => index % 2 === 0)
        .map(
            (punch) =>
                DateTime.fromSQL(
                    `${date.toSQLDate()} ${punch.time}`
                ) as DateTime<true>
        );

    const endTimes = punches
        .filter((_, index) => index % 2 === 1)
        .map(
            (punch) =>
                DateTime.fromSQL(
                    `${date.toSQLDate()} ${punch.time}`
                ) as DateTime<true>
        );

    const workedDurations = endTimes.map((end, index) =>
        end.diff(startTimes[index]).rescale()
    );

    return Duration.fromISO(
        workedDurations.reduce((acc, value) => {
            return Duration.fromISO(acc)
                .plus(value)
                .rescale()
                .toISO() as string;
        }, 'PT0H0M')
    ) as Duration<true>;
}

export function hoursToBeWorked(date: DateTime, config: Config) {
    const configuredWorkShift = config.hoursToWork[date.weekday as Weekday];

    const isoTotalHours = configuredWorkShift.durations.reduce(
        (acc, value, index) => {
            if (index % 2 === 0) {
                return Duration.fromISO(acc)
                    .plus(Duration.fromISO(value))
                    .rescale()
                    .toISO() as string;
            }

            return acc;
        },
        'PT0H0M'
    );

    return Duration.fromISO(isoTotalHours) as Duration<true>;
}
