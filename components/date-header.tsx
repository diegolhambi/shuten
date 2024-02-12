import { useForeground } from '@/utils/app-state';
import { DateTime } from 'luxon';
import React, { useCallback, useEffect, useState } from 'react';
import { SizableText } from 'tamagui';

export function DateHeader() {
    const [date, setDate] = useState(dateText());
    const [week, setWeek] = useState(weekText());

    const updateText = useCallback(() => {
        setDate(dateText());
        setWeek(weekText());
    }, []);

    useForeground(updateText);

    useEffect(() => {
        const now = DateTime.now();
        const startOfNextDay = now.plus({ days: 1 }).startOf('day');

        const timer = setTimeout(
            updateText,
            startOfNextDay.diff(now).toMillis()
        );

        return () => clearTimeout(timer);
    }, [date, week]);

    return (
        <>
            <SizableText size="$10">{date}</SizableText>
            <SizableText size="$9">{week}</SizableText>
        </>
    );
}

function dateText() {
    return DateTime.now().toLocaleString({
        localeMatcher: 'lookup',
        day: 'numeric',
        month: 'long',
    });
}

function weekText() {
    return DateTime.now().toLocaleString({
        localeMatcher: 'lookup',
        weekday: 'long',
    });
}
