import { DateTime } from 'luxon';
import React, { useMemo } from 'react';
import { SizableText } from 'tamagui';

export function DateHeader() {
    const date = useMemo(() => dateText(), [DateTime.now().toISODate()]);
    const week = useMemo(() => weekText(), [DateTime.now().toISODate()]);

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
