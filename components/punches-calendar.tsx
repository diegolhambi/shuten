import { useAppCalendar } from '@/providers/calendar';
import { useConfig } from '@/providers/config';
import { usePunchStore } from '@/providers/punches';
import {
    Calendar,
    type CalendarItemDayWithContainerProps,
    type CalendarProps,
    activeDateRangesEmitter,
    useOptimizedDayMetadata,
} from '@marceloterreiro/flash-calendar';
import { DateTime, Duration } from 'luxon';
import { memo, useEffect, useMemo } from 'react';
import { Text } from 'tamagui';

const BasePunchesCalendar = memo(
    ({
        onCalendarDayPress,
        calendarRowVerticalSpacing = 8,
        calendarRowHorizontalSpacing = 8,
        theme,
        calendarDayHeight = 48,
        calendarMonthHeaderHeight = 20,
        calendarWeekHeaderHeight = calendarDayHeight,

        ...buildCalendarParams
    }: CalendarProps) => {
        const { weeksList, weekDaysList } = useAppCalendar(buildCalendarParams);

        return (
            <Calendar.VStack
                alignItems="center"
                spacing={calendarRowVerticalSpacing}
            >
                <Calendar.Row.Week spacing={8} theme={theme?.rowWeek}>
                    {weekDaysList.map((weekDay, i) => (
                        <Calendar.Item.WeekName
                            height={calendarWeekHeaderHeight}
                            key={i}
                            theme={theme?.itemWeekName}
                        >
                            {weekDay}
                        </Calendar.Item.WeekName>
                    ))}
                </Calendar.Row.Week>
                {weeksList.map((week, index) => (
                    <Calendar.Row.Week key={index}>
                        {week.map((dayProps) => {
                            if (dayProps.isDifferentMonth) {
                                return (
                                    <Calendar.Item.Day.Container
                                        dayHeight={calendarDayHeight}
                                        daySpacing={
                                            calendarRowHorizontalSpacing
                                        }
                                        isStartOfWeek={dayProps.isStartOfWeek}
                                        key={dayProps.id}
                                        theme={theme?.itemDayContainer}
                                    >
                                        <Calendar.Item.Empty
                                            height={calendarDayHeight}
                                            theme={theme?.itemEmpty}
                                        />
                                    </Calendar.Item.Day.Container>
                                );
                            }

                            return (
                                <PunchesCalendarItemDayWithContainer
                                    containerTheme={theme?.itemDayContainer}
                                    dayHeight={calendarDayHeight}
                                    daySpacing={calendarRowHorizontalSpacing}
                                    key={dayProps.id}
                                    metadata={dayProps}
                                    onPress={onCalendarDayPress}
                                >
                                    {dayProps.displayLabel}
                                </PunchesCalendarItemDayWithContainer>
                            );
                        })}
                    </Calendar.Row.Week>
                ))}
            </Calendar.VStack>
        );
    }
);

BasePunchesCalendar.displayName = 'BasePerfTestCalendar';

export const PunchesCalendar = memo(
    ({ calendarActiveDateRanges, ...props }: CalendarProps) => {
        useEffect(() => {
            activeDateRangesEmitter.emit(
                'onSetActiveDateRanges',
                calendarActiveDateRanges ?? []
            );
        }, [calendarActiveDateRanges]);

        return <BasePunchesCalendar {...props} />;
    }
);
PunchesCalendar.displayName = 'PerfTestCalendar';

const PunchesCalendarItemDayWithContainer = ({
    children,
    metadata: baseMetadata,
    onPress,
    theme,
    dayHeight,
    daySpacing,
    containerTheme,
}: CalendarItemDayWithContainerProps) => {
    const metadata = useOptimizedDayMetadata(baseMetadata);

    const { config } = useConfig();
    const { punches } = usePunchStore();

    const date = useMemo(() => {
        return DateTime.fromJSDate(metadata.date) as DateTime<true>;
    }, [metadata.id]);

    const todayHoursToWork = useMemo(() => {
        return config.hoursToWork[date.weekday];
    }, [JSON.stringify(config), date.toISODate()]);

    const totalHoursToWork = useMemo(() => {
        const isoTotalHours = todayHoursToWork.durations.reduce(
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

        return Duration.fromISO(isoTotalHours);
    }, [todayHoursToWork]);

    const totalWorkedHours = useMemo(() => {
        const tempPunches = punches[date.toISODate()] || [];

        const startTimes = tempPunches
            .filter((_, index) => index % 2 === 0)
            .map(
                (punch) =>
                    DateTime.fromSQL(
                        `${date.toSQLDate()} ${punch.time}`
                    ) as DateTime<true>
            );

        const endTimes = tempPunches
            .filter((_, index) => index % 2 === 1)
            .map(
                (punch) =>
                    DateTime.fromSQL(
                        `${date.toSQLDate()} ${punch.time}`
                    ) as DateTime<true>
            );

        const workedDurations = endTimes.map(
            (end, index) =>
                end.diff(startTimes[index]).rescale() as Duration<true>
        );

        const total = workedDurations.reduce((acc, value) => {
            return Duration.fromISO(acc)
                .plus(value)
                .rescale()
                .toISO() as string;
        }, 'PT0H0M');

        return Duration.fromISO(total);
    }, [date, punches]);

    const totalOvertime = useMemo(() => {
        return totalWorkedHours.minus(totalHoursToWork).rescale();
    }, [todayHoursToWork, totalWorkedHours]);

    const hasInconsistentPunches = useMemo(() => {
        if (date.hasSame(DateTime.now(), 'day')) {
            return false;
        }

        if (
            punches[date.toSQLDate()] &&
            !punches[date.toSQLDate()].every(
                (punch) => punch.type === 'punch'
            ) &&
            punches[date.toSQLDate()].length !== todayHoursToWork.punches.length
        ) {
            return true;
        }

        return false;
    }, [totalHoursToWork, punches]);

    const hasOvertime = useMemo(() => {
        return totalOvertime.toMillis() > 0;
    }, [totalOvertime]);

    return (
        <Calendar.Item.Day.Container
            dayHeight={dayHeight}
            daySpacing={daySpacing}
            isStartOfWeek={metadata.isStartOfWeek}
            shouldShowActiveDayFiller={
                metadata.isRangeValid && !metadata.isEndOfWeek
                    ? !metadata.isEndOfRange
                    : false
            }
            theme={containerTheme}
        >
            <Calendar.Item.Day
                height={dayHeight}
                metadata={metadata}
                onPress={onPress}
                theme={theme}
            >
                {children}
                <Text fontSize={10}>{'\n'}</Text>
                {hasInconsistentPunches && (
                    <Text
                        fontSize={10}
                        fontFamily="$tabular"
                        themeInverse={
                            metadata.state === 'active' ? true : false
                        }
                        color="$orange10"
                    >
                        check
                    </Text>
                )}
                {!hasInconsistentPunches && hasOvertime && (
                    <Text
                        fontSize={10}
                        fontFamily="$tabular"
                        themeInverse={
                            metadata.state === 'active' ? true : false
                        }
                        color={metadata.isDisabled ? '$gray8' : '$gray11'}
                    >
                        {totalOvertime.toFormat('hh:mm')}
                    </Text>
                )}
            </Calendar.Item.Day>
        </Calendar.Item.Day.Container>
    );
};
