import { useAppCalendar } from '@/providers/calendar';
import { usePunchCalculation } from '@/providers/punch-calculation';
import {
    Calendar,
    activeDateRangesEmitter,
    useOptimizedDayMetadata,
    type CalendarItemDayWithContainerProps,
    type CalendarProps,
} from '@marceloterreiro/flash-calendar';
import { DateTime } from 'luxon';
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

    const date = useMemo(() => {
        return DateTime.fromJSDate(metadata.date) as DateTime<true>;
    }, [metadata.id]);

    const { hasInconsistency, hasUnworkedTime, hasOvertime, overtimeWorked } =
        usePunchCalculation({ date });

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
                {hasInconsistency && hasUnworkedTime && (
                    <Text
                        fontSize={10}
                        fontFamily="$tabular"
                        themeInverse={
                            metadata.state === 'active' ? true : false
                        }
                        color="$orange10"
                    >
                        -{overtimeWorked.negate().rescale().toFormat('h:mm')}
                    </Text>
                )}
                {hasInconsistency && !hasUnworkedTime && (
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
                {!hasInconsistency && hasOvertime && (
                    <Text
                        fontSize={10}
                        fontFamily="$tabular"
                        themeInverse={
                            metadata.state === 'active' ? true : false
                        }
                        color={metadata.isDisabled ? '$gray8' : '$gray11'}
                    >
                        {overtimeWorked.toFormat('h:mm')}
                    </Text>
                )}
            </Calendar.Item.Day>
        </Calendar.Item.Day.Container>
    );
};
