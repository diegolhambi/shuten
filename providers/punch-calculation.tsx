import { useConfig } from '@/providers/config';
import { usePunchStore } from '@/providers/punches';
import { DateTime, Duration } from 'luxon';
import { useEffect, useMemo, useState } from 'react';

export function usePunchCalculation(params: {
    date: DateTime;
    considerNow?: boolean;
}) {
    const [today, setToday] = useState(DateTime.now());

    const { config } = useConfig();
    const { punches } = usePunchStore();

    if (!params.date.isValid) {
        throw new Error('Invalid date');
    }

    const validDate = params.date as DateTime<true>;

    useEffect(() => {
        if (!params.considerNow) {
            return;
        }

        const interval = setInterval(() => {
            setToday(DateTime.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const configuredWorkShift = useMemo(() => {
        return config.hoursToWork[validDate.weekday];
    }, [JSON.stringify(config), validDate.toISODate()]);

    const hoursToBeWorked = useMemo(() => {
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
    }, [configuredWorkShift]);

    const hoursWorked = useMemo(() => {
        const tempPunches = punches[validDate.toISODate()] || [];

        const startTimes = tempPunches
            .filter((_, index) => index % 2 === 0)
            .map(
                (punch) =>
                    DateTime.fromSQL(
                        `${validDate.toSQLDate()} ${punch.time}`
                    ) as DateTime<true>
            );

        const endTimes = tempPunches
            .filter((_, index) => index % 2 === 1)
            .map(
                (punch) =>
                    DateTime.fromSQL(
                        `${validDate.toSQLDate()} ${punch.time}`
                    ) as DateTime<true>
            );

        if (params.considerNow && startTimes.length !== endTimes.length) {
            endTimes.push(today);
        }

        const workedDurations = endTimes.map((end, index) =>
            end.diff(startTimes[index]).rescale()
        );

        const total = workedDurations.reduce((acc, value) => {
            return Duration.fromISO(acc)
                .plus(value)
                .rescale()
                .toISO() as string;
        }, 'PT0H0M');

        return Duration.fromISO(total) as Duration<true>;
    }, [
        validDate,
        punches[validDate.toSQLDate()],
        params.considerNow ? today.toSQL() : undefined,
    ]);

    const overtimeWorked = useMemo(() => {
        return hoursWorked.minus(hoursToBeWorked).rescale();
    }, [hoursToBeWorked, hoursWorked]);

    const hasUnworkedTime = useMemo(
        () =>
            hoursWorked > Duration.fromISO('PT0H0M') &&
            hoursWorked < hoursToBeWorked &&
            overtimeWorked < Duration.fromISO('PT0H0M'),
        [hoursWorked, overtimeWorked]
    );

    const hasInconsistency = useMemo(() => {
        if (validDate.hasSame(DateTime.now(), 'day')) {
            return false;
        }

        if (
            punches[validDate.toSQLDate()] &&
            !punches[validDate.toSQLDate()].every(
                (punch) => punch.type === 'punch'
            ) &&
            punches[validDate.toSQLDate()].length !==
                configuredWorkShift.punches.length
        ) {
            return true;
        }

        if (
            punches[validDate.toSQLDate()] &&
            punches[validDate.toSQLDate()].every(
                (punch) => punch.type === 'punch'
            ) &&
            punches[validDate.toSQLDate()].length % 2 !== 0
        ) {
            return true;
        }

        if (hasUnworkedTime) {
            return true;
        }

        return false;
    }, [hasUnworkedTime, punches]);

    const hasOvertime = useMemo(() => {
        return overtimeWorked.shiftTo('minutes').minutes > 0;
    }, [overtimeWorked]);

    return {
        configuredWorkShift,
        hoursToBeWorked,
        hoursWorked,
        overtimeWorked,
        hasUnworkedTime,
        hasInconsistency,
        hasOvertime,
    };
}
