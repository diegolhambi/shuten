import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { H4, SizableText, styled, YStack } from 'tamagui';

import { is24hourClock } from '../utils/date';

const format: Intl.DateTimeFormatOptions = {
    hour12: !is24hourClock(),
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
};

function dateTextNow() {
    return DateTime.now().toLocaleString({
        localeMatcher: 'lookup',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

const Wrapper = styled(YStack, {
    name: 'DateTimeWrapper',
    flexGrow: 0,
    alignItems: 'flex-end',
});

export default function Clock() {
    const [time, setTime] = useState(DateTime.now().toLocaleString(format));
    const [today, setToday] = useState(dateTextNow());

    useEffect(() => {
        const timer = setInterval(() => {
            setToday(dateTextNow());
        }, 21600000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(DateTime.now().toLocaleString(format));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Wrapper>
            <H4>{time}</H4>
            <SizableText size="$4">{today}</SizableText>
        </Wrapper>
    );
}
