import { DateTime } from 'luxon';
import React, { useMemo } from 'react';
import { Circle, H4, SizableText, styled, XStack, YStack } from 'tamagui';

import { Punch, PunchType } from '../types/punch';
import { hoursDiff, is24hourClock, ParseTime } from '../utils/date';

const Indicator = styled(Circle, {
    name: 'Indicator',
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

const Interval = styled(SizableText, {
    color: '$gray9',
    variants: {
        is24hour: {
            true: {
                fontSize: '$true',
            },
            false: {
                fontSize: '$1',
            },
        },
    } as const,
});

const is24hour = is24hourClock();

const punchLabel: { [K in Exclude<PunchType, 'punch'>]: string } = {
    weekend: 'Weekend',
    dayOff: 'Day off',
    absence: 'Absence',
    holiday: 'Holiday',
    vacation: 'Vacation',
};

function Time({ punch, index }: { punch: Punch; index: number }) {
    const time = useMemo(() => {
        if (is24hourClock()) {
            return punch.time;
        }

        const time = ParseTime(punch.time);

        return time.toLocaleString(DateTime.TIME_SIMPLE);
    }, [punch.time]);

    return (
        <XStack
            space="$1.5"
            alignItems="center"
        >
            {punch.type === 'punch' && (
                <Indicator
                    enter={index % 2 === 0}
                    predicted={punch.predicted}
                />
            )}
            <SizableText
                color={
                    punch.predicted || punch.type !== 'punch'
                        ? '$gray9'
                        : '$color'
                }
            >
                {punch.type !== 'punch' ? punchLabel[punch.type] : time}
            </SizableText>
        </XStack>
    );
}

export type PunchItemProps = {
    day: string;
    today: string;
    fetchedPunches: number;
    getPunches: (day: string) => Punch[];
};

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
        <YStack
            mx="$4"
            my="$3"
        >
            <XStack
                space="$2.5"
                alignItems="center"
            >
                <H4
                    mb="$2"
                    selectable={false}
                >
                    {dayText}
                </H4>
                {isToday && (
                    <Circle
                        size={10}
                        mb="$2"
                        bg="$blue9"
                    />
                )}
            </XStack>
            <XStack
                flexWrap="wrap"
                space={is24hour ? '$3.5' : '$2.5'}
                alignItems="center"
                ml={is24hour ? '$1' : '$0'}
            >
                {punches.length === 0 ? (
                    <SizableText color="$gray9">No punches</SizableText>
                ) : (
                    punches.map((punch, index) => {
                        return (
                            <React.Fragment key={`${day}-${punch.time}`}>
                                {index > 0 && index % 2 === 0 && (
                                    <Interval mr={is24hour ? '$3.5' : '$2.5'}>
                                        {hoursDiff(
                                            (punches[index - 1] as Punch).time,
                                            punch.time,
                                        )}
                                    </Interval>
                                )}
                                <Time
                                    punch={punch}
                                    index={index}
                                />
                            </React.Fragment>
                        );
                    })
                )}
            </XStack>
        </YStack>
    );
}
