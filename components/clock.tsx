import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';
import { SizableText, styled } from 'tamagui';

import { is24hourClock } from '@/utils/date';

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

export default function Clock() {
    const [time, setTime] = useState(DateTime.now().toLocaleString(format));
    const today = useMemo(() => dateTextNow(), [DateTime.now().toISODate()]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(DateTime.now().toLocaleString(format));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return <ClockText>{time}</ClockText>;
}

const ClockText = styled(SizableText, {
    name: 'Clock',
    pl: '$4',
    pr: '$3',
    size: '$8',
    fontFamily: '$tabular',
});
