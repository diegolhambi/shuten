import { DateTime } from 'luxon';
import React, { useMemo } from 'react';
import { Circle, SizableText, XStack, YStack, styled } from 'tamagui';

import type { Punch, PunchType } from '@/types/punch';
import { ParseTime, hoursDiff, is24hourClock } from '@/utils/date';

const is24hour = is24hourClock();

const punchLabel: { [K in Exclude<PunchType, 'punch'>]: string } = {
    weekend: 'Weekend',
    dayOff: 'Day off',
    absence: 'Absence',
    holiday: 'Holiday',
    vacation: 'Vacation',
    nonWorkingDay: 'Out of office',
};

export type PunchItemProps = {
    day: string;
    today: DateTime;
    fetchedPunches: number;
    getPunches: (day: string) => Punch[];
};

export default function PunchItem(props: PunchItemProps) {
    const { day, today, fetchedPunches, getPunches } = props;

    const dayText = useMemo(() => {
        return DateTime.fromISO(day).toLocaleString({
            localeMatcher: 'lookup',
            weekday: 'long',
            day: '2-digit',
            month: 'long',
        });
    }, [day]);

    const punches = useMemo(() => getPunches(day), [day, fetchedPunches]);

    const isToday = useMemo(() => day === today.toISODate(), [day, today]);

    return (
        <PunchItemFrame>
            <PunchItemDayFrame>
                <PunchItemDayText>{dayText}</PunchItemDayText>
                {isToday && <PunchItemTodayCircle />}
            </PunchItemDayFrame>
            <PunchItemTimeFrame is24hour={is24hour}>
                {punches.length === 0 ? (
                    <SizableText color="$gray9" size="$2">
                        No punches
                    </SizableText>
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
                                            punch.time
                                        )}
                                    </TimeInterval>
                                )}
                                <Time punch={punch} />
                            </React.Fragment>
                        );
                    })
                )}
            </PunchItemTimeFrame>
        </PunchItemFrame>
    );
}

function Time({ punch }: { punch: Punch }) {
    const time = useMemo(() => {
        if (is24hourClock()) {
            return punch.time;
        }

        const time = ParseTime(punch.time);

        return time.toLocaleString(DateTime.TIME_SIMPLE);
    }, [punch.time]);

    return (
        <TimeFrame>
            <TimeText
                isPunch={punch.type === 'punch'}
                predicted={punch.predicted}
            >
                {punch.type !== 'punch' ? punchLabel[punch.type] : time}
            </TimeText>
        </TimeFrame>
    );
}

const PunchItemFrame = styled(YStack, {
    name: 'PunchItemFrame',
    px: '$4',
    py: '$2.5',
});

const PunchItemDayFrame = styled(XStack, {
    name: 'PunchItemDayFrame',
    gap: '$2.5',
    alignItems: 'center',
});

const PunchItemDayText = styled(SizableText, {
    name: 'PunchItemDayText',
    size: '$7',
    mb: '$0',
    selectable: false,
});

const PunchItemTodayCircle = styled(Circle, {
    name: 'PunchItemTodayCircle',
    size: 10,
    bg: '$blue9',
});

const PunchItemTimeFrame = styled(XStack, {
    name: 'PunchItemTimeFrame',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '$2.5',
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

const TimeFrame = styled(XStack, {
    name: 'TimeFrame',
    gap: '$1.5',
    alignItems: 'center',
});

const TimeText = styled(SizableText, {
    name: 'TimeText',
    color: '$gray9',
    size: '$2',
    variants: {
        isPunch: {
            true: { color: '$color' },
        },
        predicted: {
            true: { color: '$gray9' },
        },
    } as const,
});

const TimeInterval = styled(SizableText, {
    name: 'TimeInterval',
    color: '$gray9',
    mx: '$2',
    size: '$2',
    variants: {
        intervalEnded: {
            true: { color: '$color' },
        },
    } as const,
});
