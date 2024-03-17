import { useMemo } from 'react';

import type { DayState } from '@marceloterreiro/flash-calendar/src/components/CalendarItemDay';
import {
    addDays,
    endOfMonth,
    fromDateId,
    isWeekend,
    startOfMonth,
    startOfWeek,
    subDays,
    toDateId,
} from '@marceloterreiro/flash-calendar/src/helpers/dates';
import { range } from '@marceloterreiro/flash-calendar/src/helpers/numbers';
import { DateTime } from 'luxon';
import {
    CalendarDayMetadata,
    UseCalendarParams,
} from '@marceloterreiro/flash-calendar';

const getNumberOfEmptyCellsAtStart = (
    month: Date,
    firstDayOfWeek: 'sunday' | 'monday'
) => {
    const startOfMonthDay = month.getDay();

    if (firstDayOfWeek === 'sunday') {
        return startOfMonthDay;
    }

    return startOfMonthDay === 0 ? 6 : startOfMonthDay - 1;
};

/** All fields that affects the day's state. */
interface CalendarDayStateFields {
    /** Is this day disabled? */
    isDisabled: boolean;
    /** Is this the current day? */
    isToday: boolean;
    /** Is this the start of a range? */
    isStartOfRange: boolean;
    /**  Is this the end of a range? */
    isEndOfRange: boolean;
    /** The state of the day */
    state: DayState;
    /** Is the range valid (has both start and end dates set)? */
    isRangeValid: boolean;
}

type GetStateFields = Pick<
    UseCalendarParams,
    | 'calendarActiveDateRanges'
    | 'calendarMinDateId'
    | 'calendarMaxDateId'
    | 'calendarDisabledDateIds'
> & {
    todayId?: string;
    id: string;
};

/**
 * Computes the state fields for a given date.
 */
export const getStateFields = ({
    todayId,
    id,
    calendarActiveDateRanges,
    calendarMinDateId,
    calendarMaxDateId,
    calendarDisabledDateIds,
}: GetStateFields): CalendarDayStateFields => {
    const activeRange = calendarActiveDateRanges?.find(({ startId, endId }) => {
        // Regular range
        if (startId && endId) {
            return id >= startId && id <= endId;
        }
        if (startId) {
            return id === startId;
        } else if (endId) {
            return id === endId;
        }
        return false;
    });

    const isRangeValid =
        activeRange?.startId !== undefined && activeRange.endId !== undefined;

    const isDisabled =
        (calendarDisabledDateIds?.includes(id) ||
            (calendarMinDateId && id < calendarMinDateId) ||
            (calendarMaxDateId && id > calendarMaxDateId)) === true;

    const isToday = todayId === id;

    const state: DayState = activeRange
        ? ('active' as const)
        : isDisabled
          ? 'disabled'
          : isToday
              ? 'today'
              : 'idle';

    return {
        isStartOfRange: id === activeRange?.startId,
        isEndOfRange: id === activeRange?.endId,
        isRangeValid,
        state,
        isDisabled,
        isToday,
    };
};

const monthIdToLabel = {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December',
};

const weekDayIdToLabel = {
    0: 'S',
    1: 'M',
    2: 'T',
    3: 'W',
    4: 'T',
    5: 'F',
    6: 'S',
};

const getBaseCalendarMonthFormat = (date: Date) => {
    const year = date.getFullYear();
    const month =
        monthIdToLabel[
            date.getMonth() as unknown as keyof typeof monthIdToLabel
        ];
    return `${month} ${year}`;
};
const getBaseCalendarWeekDayFormat = (date: Date) => {
    return weekDayIdToLabel[
        date.getDay() as unknown as keyof typeof weekDayIdToLabel
    ];
};

const getBaseCalendarDayFormat = (date: Date) => {
    return `${date.getDate()}`;
};

/**
 * Builds a calendar based on the given parameters.
 */
export const buildCalendar = (params: UseCalendarParams) => {
    const {
        calendarMinDateId = toDateId(DateTime.now().toJSDate()),
        calendarMaxDateId = toDateId(DateTime.now().endOf('month').toJSDate()),
        calendarFirstDayOfWeek = 'sunday',
        getCalendarMonthFormat = getBaseCalendarMonthFormat,
        getCalendarWeekDayFormat = getBaseCalendarWeekDayFormat,
        getCalendarDayFormat = getBaseCalendarDayFormat,
    } = params;

    const monthStart = fromDateId(calendarMinDateId);
    const monthEnd = fromDateId(calendarMaxDateId);

    const monthStartId = toDateId(monthStart);
    const monthEndId = toDateId(monthEnd);

    const emptyDaysAtStart = getNumberOfEmptyCellsAtStart(
        monthStart,
        calendarFirstDayOfWeek
    );

    const startOfWeekIndex = calendarFirstDayOfWeek === 'sunday' ? 0 : 1;
    const endOfWeekIndex = calendarFirstDayOfWeek === 'sunday' ? 6 : 0;

    const todayId = toDateId(new Date());

    // The first day to iterate is the first day of the month minus the empty days at the start
    let dayToIterate = subDays(monthStart, emptyDaysAtStart);

    const weeksList: CalendarDayMetadata[][] = [
        [
            ...range(1, emptyDaysAtStart).map((): CalendarDayMetadata => {
                const id = toDateId(dayToIterate);

                const dayShape: CalendarDayMetadata = {
                    date: dayToIterate,
                    displayLabel: getCalendarDayFormat(dayToIterate),
                    id,
                    isDifferentMonth: true,
                    isEndOfMonth: false,
                    isEndOfWeek: dayToIterate.getDay() === endOfWeekIndex,
                    isStartOfMonth: false,
                    isStartOfWeek: dayToIterate.getDay() === startOfWeekIndex,
                    isWeekend: isWeekend(dayToIterate),
                    ...getStateFields({
                        ...params,
                        todayId,
                        id,
                    }),
                };
                dayToIterate = addDays(dayToIterate, 1);
                return dayShape;
            }),
        ],
    ];

    // By this point, we're back at the start of the month
    while (DateTime.fromJSDate(dayToIterate) <= DateTime.fromJSDate(monthEnd)) {
        const currentWeek = weeksList[weeksList.length - 1];
        if (currentWeek.length === 7) {
            weeksList.push([]);
        }
        const id = toDateId(dayToIterate);
        weeksList[weeksList.length - 1].push({
            date: dayToIterate,
            displayLabel: getCalendarDayFormat(dayToIterate),
            id,
            isDifferentMonth: false,
            isEndOfMonth: id === monthEndId,
            isEndOfWeek: dayToIterate.getDay() === endOfWeekIndex,
            isStartOfMonth: id === monthStartId,
            isStartOfWeek: dayToIterate.getDay() === startOfWeekIndex,
            isWeekend: isWeekend(dayToIterate),
            ...getStateFields({
                ...params,
                todayId,
                id,
            }),
        });
        dayToIterate = addDays(dayToIterate, 1);
    }

    // Once all the days of the month have been added, we need to add the empty days at the end
    const lastWeek = weeksList[weeksList.length - 1];
    const emptyDaysAtEnd = 7 - lastWeek.length;
    lastWeek.push(
        ...range(1, emptyDaysAtEnd).map(() => {
            const id = toDateId(dayToIterate);
            const dayShape: CalendarDayMetadata = {
                date: dayToIterate,
                displayLabel: getCalendarDayFormat(dayToIterate),
                id,
                isDifferentMonth: true,
                isEndOfMonth: false,
                isEndOfWeek: dayToIterate.getDay() === endOfWeekIndex,
                isStartOfMonth: false,
                isStartOfWeek: dayToIterate.getDay() === startOfWeekIndex,
                isWeekend: isWeekend(dayToIterate),
                ...getStateFields({
                    ...params,
                    todayId,
                    id,
                }),
            };
            dayToIterate = addDays(dayToIterate, 1);
            return dayShape;
        })
    );

    const startOfWeekDate = startOfWeek(
        startOfMonth(monthStart),
        calendarFirstDayOfWeek
    );
    const weekDaysList = range(1, 7).map((i) =>
        getCalendarWeekDayFormat(addDays(startOfWeekDate, i - 1))
    );

    return {
        weeksList,
        calendarRowMonth: getCalendarMonthFormat(startOfMonth(monthStart)),
        weekDaysList,
    };
};

/**
 * Returns a memoized calendar based on the given parameters.
 */
export const useAppCalendar = (params: UseCalendarParams) =>
    useMemo(() => buildCalendar(params), [params]);
