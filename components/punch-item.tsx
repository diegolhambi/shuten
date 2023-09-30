import { DateTime } from 'luxon';
import React, { useMemo } from 'react';
import { Circle, H4, SizableText, styled, XStack, YStack } from 'tamagui';

import { Punch, PunchType } from '../types/punch';
import { hoursDiff, is24hourClock, ParseTime } from '../utils/date';

const is24hour = is24hourClock();

const punchLabel: { [K in Exclude<PunchType, 'punch'>]: string } = {
    weekend: 'Weekend',
    dayOff: 'Day off',
    absence: 'Absence',
    holiday: 'Holiday',
    vacation: 'Vacation',
    nonWorkingDay: 'Out of office',
};

const TimeFrame = styled(XStack, {
    name: 'TimeFrame',
    gap: '$1.5',
    alignItems: 'center',
});

const TimeText = styled(SizableText, {
    name: 'TimeText',
    color: '$gray9',
    fontSize: '$3',
    variants: {
        isPunch: {
            true: { color: '$color' },
        },
        predicted: {
            true: { color: '$gray9' },
        },
    } as const,
});

const TimeIndicator = styled(Circle, {
    name: 'TimeIndicator',
    size: '$0.75',
    variants: {
        enter: {
            true: { bg: '$red9' },
            false: { bg: '$green9' },
        },
        predicted: {
            true: { bg: '$gray9' },
        },
    } as const,
});

const TimeInterval = styled(SizableText, {
    name: 'TimeInterval',
    color: '$gray9',
    fontSize: '$2',
    variants: {
        intervalEnded: {
            true: { color: '$color' },
        },
    } as const,
});

function Time({ punch, index }: { punch: Punch; index: number }) {
    const time = useMemo(() => {
        if (is24hourClock()) {
            return punch.time;
        }

        const time = ParseTime(punch.time);

        return time.toLocaleString(DateTime.TIME_SIMPLE);
    }, [punch.time]);

    return (
        <TimeFrame>
            {punch.type === 'punch' && (
                <TimeIndicator
                    enter={index % 2 === 0}
                    predicted={punch.predicted}
                />
            )}
            <TimeText
                isPunch={punch.type === 'punch'}
                predicted={punch.predicted}
            >
                {punch.type !== 'punch' ? punchLabel[punch.type] : time}
            </TimeText>
        </TimeFrame>
    );
}

export type PunchItemProps = {
    day: string;
    today: string;
    fetchedPunches: number;
    getPunches: (day: string) => Punch[];
};

const PunchItemFrame = styled(YStack, {
    name: 'PunchItemFrame',
    mx: '$4',
    my: '$3',
});

const PunchItemDayFrame = styled(XStack, {
    name: 'PunchItemDayFrame',
    gap: '$2.5',
    alignItems: 'center',
});

const PunchItemDayText = styled(H4, {
    name: 'PunchItemDayText',
    mb: '$2',
    selectable: false,
});

const PunchItemTodayCircle = styled(Circle, {
    name: 'PunchItemTodayCircle',
    size: 10,
    mb: '$2',
    bg: '$blue9',
});

const PunchItemTimeFrame = styled(XStack, {
    name: 'PunchItemTimeFrame',
    flexWrap: 'wrap',
    alignItems: 'center',
    variants: {
        is24hour: {
            false: {
                ml: '$1',
            },
            true: {
                ml: '$1',
            },
        },
    } as const,
});

export default function PunchItem(props: PunchItemProps) {
    const { day, today, fetchedPunches, getPunches } = props;

    const dayText = useMemo(() => {
        return DateTime.fromISO(day).toLocaleString({
            localeMatcher: 'lookup',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    }, [day]);

    const punches = useMemo(() => getPunches(day), [day, fetchedPunches]);

    const isToday = useMemo(() => day === today, [day, today]);

    return (
        <PunchItemFrame>
            <PunchItemDayFrame>
                <PunchItemDayText>{dayText}</PunchItemDayText>
                {isToday && <PunchItemTodayCircle />}
            </PunchItemDayFrame>
            <PunchItemTimeFrame
                is24hour={is24hour}
                gap={is24hour ? '$2.5' : '$2.5'}
            >
                {punches.length === 0 ? (
                    <SizableText color="$gray9">No punches</SizableText>
                ) : (
                    punches.map((punch, index) => {
                        return (
                            <React.Fragment key={`${day}-${punch.time}`}>
                                {index > 0 && index % 2 === 0 && (
                                    <TimeInterval
                                        intervalEnded={!punches[2]?.predicted}
                                    >
                                        {hoursDiff(
                                            (punches[index - 1] as Punch).time,
                                            punch.time,
                                        )}
                                    </TimeInterval>
                                )}
                                <Time
                                    punch={punch}
                                    index={index}
                                />
                            </React.Fragment>
                        );
                    })
                )}
            </PunchItemTimeFrame>
        </PunchItemFrame>
    );
}
