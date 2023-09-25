import { Stack } from 'expo-router';
import { DateTime } from 'luxon';
import { useContext, useState } from 'react';
import {
    Button,
    H4,
    H5,
    Label,
    ScrollView,
    SizableText,
    styled,
    ToggleGroup,
    XGroup,
    XStack,
    YStack,
} from 'tamagui';

import { AppSwitch } from '../../components/app-switch';
import ConfigContext, { HoursToWork } from '../../providers/config';
import {
    getWeekdays,
    is24hourClock,
    ParseTime,
    Weekday,
} from '../../utils/date';

const textWeekdays = {
    short: getWeekdays(),
    long: getWeekdays('long'),
};

const listWeekdays: Weekday[] = [7, 1, 2, 3, 4, 5, 6];

const is24hour = is24hourClock();

const ButtonTime = styled(Button, {
    name: 'ButtonTime',
    bg: '$backgroundFocus',
    variants: {
        is24hour: {
            false: {
                p: '$2.5',
            },
            true: {},
        },
    },
});

const empty: HoursToWork = {
    punches: ['00:00', '00:00', '00:00', '00:00'],
    durations: ['P0M', 'P0M', 'P0M'],
};
function HoursWorked(props: { value: HoursToWork }) {
    let { value } = props;

    if (value.punches.length === 0) {
        value = empty;
    }

    return (
        <XGroup>
            {value.punches.map((punch, index) => {
                const time = is24hour
                    ? punch
                    : ParseTime(punch).toLocaleString(DateTime.TIME_SIMPLE);

                return (
                    <XGroup.Item key={index}>
                        <ButtonTime is24hour={is24hour}>{time}</ButtonTime>
                    </XGroup.Item>
                );
            })}
        </XGroup>
    );
}

function ConfigHours() {
    const { config } = useContext(ConfigContext);

    const [weekdays, setWeekdays] = useState<Weekday[]>(() => {
        return Object.entries(config.hoursToWork)
            .filter(([, value]) => value.punches.length > 0)
            .map(([key]) => parseInt(key as string, 10) as Weekday)
            .sort();
    });
    const [sameForAllWeekdays, setSameForAllWeekdays] = useState(true);

    function updateWeekdays(value: string[]) {
        if (value.length === 0) {
            return;
        }

        setWeekdays(
            value.map((value) => parseInt(value, 10) as Weekday).sort(),
        );
    }

    return (
        <YStack space="$4">
            <H4>Workdays</H4>

            <ToggleGroup
                value={weekdays.map((value) => value.toString())}
                onValueChange={updateWeekdays}
                type="multiple"
                size="$4"
                orientation="horizontal"
                backgroundColor="$false"
            >
                {listWeekdays.map((value) => (
                    <ToggleGroup.Item
                        key={`${value}`}
                        value={`${value}`}
                    >
                        <SizableText>{textWeekdays.short[value]}</SizableText>
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup>

            <H4>Work hours</H4>

            <XStack
                space="$3"
                alignItems="center"
            >
                <AppSwitch
                    id="same-for-all-weeks"
                    size="$3"
                    checked={sameForAllWeekdays}
                    onCheckedChange={setSameForAllWeekdays}
                >
                    <AppSwitch.Thumb />
                </AppSwitch>
                <Label htmlFor="same-for-all-weeks">
                    Same work hours for all workdays
                </Label>
            </XStack>

            {sameForAllWeekdays ? (
                <HoursWorked value={config.hoursToWork[1]} />
            ) : (
                weekdays.map((value, index) => {
                    return (
                        <YStack
                            space="$4"
                            key={`${value}-${index}`}
                        >
                            <H5>{textWeekdays.long[value]}</H5>

                            <HoursWorked value={config.hoursToWork[value]} />
                        </YStack>
                    );
                })
            )}
        </YStack>
    );
}

export default function Hours() {
    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Workdays',
                }}
            />
            <ScrollView>
                <YStack
                    space="$4"
                    p="$4"
                >
                    <ConfigHours />
                </YStack>
            </ScrollView>
        </>
    );
}
