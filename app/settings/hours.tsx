import { Stack } from 'expo-router';
import { DateTime } from 'luxon';
import React, { useContext, useEffect, useRef, useState } from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
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
import ConfigContext, {
    defaultHourToWork,
    HoursToWork,
} from '../../providers/config';
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

type HoursWorkedProps = {
    weekday: Weekday | 0;
    defaultValue: HoursToWork;
    initialValue: HoursToWork;
    onChange: (value: HoursToWork) => void;
};

function HoursWorked(props: HoursWorkedProps) {
    const { weekday, defaultValue, initialValue, onChange } = props;

    const [value, setValue] = useState<HoursToWork>(() => {
        if (initialValue.punches.length === 0) {
            return defaultValue;
        }

        return initialValue;
    });

    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [datePickerValue, setDatePickerValue] = useState(new Date());
    const indexEditing = useRef(-1);

    function openDateTimePicker(index: number) {
        setDatePickerValue(
            DateTime.fromFormat(value.punches[index]!, 'HH:mm').toJSDate()
        );
        indexEditing.current = index;
    }

    useEffect(() => {
        if (JSON.stringify(value) === JSON.stringify(initialValue)) {
            return;
        }

        onChange(value);
    }, [value]);

    function handleDatePicked(newTime: Date) {
        setValue((prev) => {
            const newPunches = [...prev.punches];
            newPunches[indexEditing.current] =
                DateTime.fromJSDate(newTime).toFormat('HH:mm');

            const newDurations: string[] = [];
            for (let i = 0; i < newPunches.length - 1; i++) {
                const duration = ParseTime(newPunches[i + 1]!).diff(
                    ParseTime(newPunches[i]!)
                );

                newDurations.push(duration.rescale().toString()!);
            }

            setIsDatePickerVisible(false);
            return { punches: newPunches, durations: newDurations };
        });

        indexEditing.current = -1;
    }

    return (
        <>
            <XGroup alignSelf="center">
                {value.punches.map((punch, index) => {
                    const time = is24hour
                        ? punch
                        : ParseTime(punch).toLocaleString(DateTime.TIME_SIMPLE);

                    return (
                        <XGroup.Item key={`hours-${weekday}-${index}`}>
                            <ButtonTime
                                is24hour={is24hour}
                                onPress={() => {
                                    openDateTimePicker(index);
                                    setIsDatePickerVisible(true);
                                }}
                            >
                                {time}
                            </ButtonTime>
                        </XGroup.Item>
                    );
                })}
            </XGroup>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="time"
                date={datePickerValue}
                onConfirm={handleDatePicked}
                onCancel={() => {
                    setIsDatePickerVisible(false);
                }}
            />
        </>
    );
}

function ConfigHours() {
    const { config, setConfig } = useContext(ConfigContext);

    const [initialValue, setInitialValue] =
        useState<HoursToWork>(defaultHourToWork);

    const [weekdays, setWeekdays] = useState<Weekday[]>(() => {
        return Object.entries(config.hoursToWork)
            .filter(([, value]) => value.punches.length > 0)
            .map(([key]) => parseInt(key as string, 10) as Weekday)
            .sort();
    });

    const [sameForAllWeekdays, setSameForAllWeekdays] = useState<boolean>(
        () => {
            if (weekdays.length === 0) {
                return true;
            }

            const test = Object.values(config.hoursToWork).filter(
                (value) => value.punches.length > 0
            );

            const firstObject = JSON.stringify(test[0]);
            return test.every(
                (element) => JSON.stringify(element) === firstObject
            );
        }
    );

    function updateWeekdays(value: string[]) {
        if (value.length === 0) {
            return;
        }

        const newWeekdays = value.map((i) => parseInt(i, 10) as Weekday).sort();

        setWeekdays(newWeekdays);

        const newHoursToWork = { ...config.hoursToWork };

        if (sameForAllWeekdays) {
            const hoursToWork = Object.values(newHoursToWork).find(
                (value) => value.punches.length > 0
            );

            setInitialValue(hoursToWork!);

            for (let index: Weekday = 1; index <= 7; index++) {
                if (!newWeekdays.includes(index as Weekday)) {
                    newHoursToWork[index as Weekday] = {
                        durations: [],
                        punches: [],
                    };
                    continue;
                }

                newHoursToWork[index as Weekday] = hoursToWork!;
            }

            setConfig({
                ...config,
                hoursToWork: newHoursToWork,
            });
            return;
        }

        for (let index: Weekday = 1; index <= 7; index++) {
            if (!newWeekdays.includes(index as Weekday)) {
                newHoursToWork[index as Weekday] = {
                    durations: [],
                    punches: [],
                };
            }
        }

        setConfig({
            ...config,
            hoursToWork: newHoursToWork,
        });
    }

    function handleHourChange(weekday: Weekday | 0, value: HoursToWork) {
        const newHoursToWork = { ...config.hoursToWork };

        if (sameForAllWeekdays) {
            for (let index: Weekday = 1; index <= 7; index++) {
                if (!weekdays.includes(index as Weekday)) {
                    newHoursToWork[index as Weekday] = {
                        durations: [],
                        punches: [],
                    };

                    continue;
                }

                newHoursToWork[index as Weekday] = value;
            }

            console.log(newHoursToWork);

            setConfig({
                ...config,
                hoursToWork: newHoursToWork,
            });

            return;
        }

        setConfig({
            ...config,
            hoursToWork: {
                ...config.hoursToWork,
                [weekday]: value,
            },
        });
    }

    return (
        <YStack space="$4">
            <H4>Workdays</H4>

            <ToggleGroup
                value={weekdays.map((value) => value.toString())}
                onValueChange={updateWeekdays}
                type="multiple"
                size="$4"
                alignSelf="center"
                orientation="horizontal"
                backgroundColor="$false"
            >
                {listWeekdays.map((value) => (
                    <ToggleGroup.Item key={`${value}`} value={`${value}`}>
                        <SizableText>{textWeekdays.short[value]}</SizableText>
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup>

            <H4>Work hours</H4>

            <XStack space="$3" alignItems="center">
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
                <HoursWorked
                    weekday={0}
                    defaultValue={initialValue}
                    initialValue={config.hoursToWork[1]}
                    onChange={(value) => handleHourChange(0, value)}
                />
            ) : (
                listWeekdays.map((weekday) => {
                    if (!weekdays.includes(weekday)) {
                        return null;
                    }
                    return (
                        <YStack space="$4" key={`weekday-${weekday}`}>
                            <H5>{textWeekdays.long[weekday]}</H5>

                            <HoursWorked
                                weekday={weekday}
                                defaultValue={initialValue}
                                initialValue={config.hoursToWork[weekday]}
                                onChange={(value) =>
                                    handleHourChange(weekday, value)
                                }
                            />
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
                <YStack space="$4" p="$4">
                    <ConfigHours />
                </YStack>
            </ScrollView>
        </>
    );
}
