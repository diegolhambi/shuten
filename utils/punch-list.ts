import { DateTime, Duration } from 'luxon';

import { Config } from '../providers/config';
import { Punch } from '../types/punch';
import { Weekday } from './date';

export function monthDaysRange(
    firstDay: number,
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

    return [initalDate, finalDate];
}

export function days(firstDay: number): string[] {
    const [initalDate, finalDate] = monthDaysRange(firstDay);

    const diff = finalDate.diff(initalDate, 'days').days;

    const days: string[] = [];

    for (let i = 0; i < diff; i++) {
        const date = initalDate.plus({ days: i });

        days.push(date.toISODate() as string);
    }

    return days;
}

export function indexToday(firstDay: number): number {
    const [initialDate] = monthDaysRange(firstDay);

    return DateTime.now().diff(initialDate, 'days').days;
}

export function getDayPunches(punches: Map<string, Punch[]>, config: Config) {
    const today = DateTime.now();

    return (day: string): Punch[] => {
        const listPunches = punches.get(day) || [];

        const date = DateTime.fromISO(day);

        const configHours = config.hoursToWork[date.weekday as Weekday] || {
            punches: [],
            durations: [],
        };

        if (
            listPunches.length === 0 &&
            configHours.punches.length === 0 &&
            [6, 7].indexOf(date.weekday) !== -1
        ) {
            return [{ time: '00:00', type: 'weekend', predicted: true }];
        }

        if (
            listPunches.length === 0 &&
            configHours.punches.length === 0 &&
            [1, 2, 3, 4, 5].indexOf(date.weekday) !== -1
        ) {
            return [{ time: '00:00', type: 'nonWorkingDay', predicted: true }];
        }

        if (
            listPunches.length >= 4 ||
            listPunches.some((item: Punch) => item.type !== 'punch')
        ) {
            return listPunches;
        }

        if (!date.hasSame(today, 'day')) {
            return listPunches;
        }

        if (configHours.punches.length === 0 && listPunches.length > 0) {
            return listPunches;
        }

        const firstPeriod = Duration.fromISO(
            configHours.durations[0] as string,
        );
        const lunchPeriod = Duration.fromISO(
            configHours.durations[1] as string,
        );
        const secondPeriod = Duration.fromISO(
            configHours.durations[configHours.durations.length - 1] as string,
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
                        'HH:mm',
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
                    'HH:mm',
                );
                const lunchOut = DateTime.fromFormat(
                    (listPunches[1] as Punch).time,
                    'HH:mm',
                );
                const lunchIn = DateTime.fromFormat(
                    (listPunches[2] as Punch).time,
                    'HH:mm',
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
                        'HH:mm',
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
    };
}
