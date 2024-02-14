import { getCalendars, getLocales } from 'expo-localization';
import { DateTime } from 'luxon';
import { Platform } from 'react-native';

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function is24hourClock(): boolean {
    const calendars = getCalendars();

    if (calendars[0]) {
        return !!calendars[0].uses24hourClock;
    }

    return true;
}

export function ParseTime(time: string): DateTime {
    return DateTime.fromFormat(time, 'HH:mm');
}

export function hoursDiff(timeEarlier: string, timeLater: string): string {
    return ParseTime(timeLater).diff(ParseTime(timeEarlier)).toFormat('hh:mm');
}

export function getWeekdays(format: 'long' | 'short' | 'narrow' = 'narrow') {
    const weekdays: { [key in Weekday]: string } = {
        1: 'M',
        2: 'T',
        3: 'W',
        4: 'T',
        5: 'F',
        6: 'S',
        7: 'S',
    };

    for (let i = 1; i <= 7; i++) {
        weekdays[i as Weekday] = DateTime.fromObject({
            weekday: i,
        }).toLocaleString({
            weekday: format,
        });
    }

    return weekdays;
}

export function fTime(time: DateTime): string {
    return time.toLocaleString({
        hour12: !is24hourClock(),
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function fDateShort(date: DateTime): string {
    const locales = getLocales();
    const languageTag =
        Platform.OS === 'android'
            ? locales[locales.length - 1].languageTag
            : locales[0].languageTag;

    return date.setLocale(languageTag).toLocaleString(DateTime.DATE_SHORT);
}
