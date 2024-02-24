import { usePunchStore } from '@/providers/punches';
import { fDateShort, fTime } from '@/utils/date';
import { useToastController } from '@tamagui/toast';
import { useFocusEffect } from 'expo-router';
import { DateTime } from 'luxon';
import React, { useState, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
    Button,
    Label,
    Sheet,
    SheetProps,
    SizableText,
    XStack,
    YStack,
} from 'tamagui';

export function ManualPunch(
    props: SheetProps & { onConfirm?: (selected: DateTime) => void }
) {
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [timePickerVisible, setTimePickerVisible] = useState(false);

    const [date, setDate] = useState(DateTime.now());
    const jsDate = useMemo(() => date.toJSDate(), [date]);

    const { insert } = usePunchStore();
    const toast = useToastController();

    useFocusEffect(
        useCallback(() => {
            setDate(DateTime.now());
        }, [props.open])
    );

    function handleDatePicked(date: Date) {
        const newDate = DateTime.fromJSDate(date);
        setDate((prev) => {
            newDate.set({ hour: prev.hour, minute: prev.minute });
            return newDate as DateTime<true>;
        });
        setDatePickerVisible(false);
    }

    function handleTimePicked(date: Date) {
        const newDate = DateTime.fromJSDate(date);
        setDate((prev) => {
            newDate.set({ day: prev.day, month: prev.month, year: prev.year });
            return newDate as DateTime<true>;
        });
        setTimePickerVisible(false);
    }

    function handleConfirm() {
        props.onOpenChange?.(false);

        insert(date).then((value) => {
            if (value === 'Inserted') {
                toast.show('Manual punch added', {
                    message: `${fDateShort(date)} ${fTime(date)}`,
                });
            } else {
                toast.show('Punch already exists', {
                    message: value,
                });
            }
        });
    }

    return (
        <Sheet modal snapPointsMode="fit" {...props}>
            <Sheet.Overlay />
            <Sheet.Handle />
            <Sheet.Frame
                gap="$1"
                px="$4"
                pt="$4"
                pb={Platform.OS === 'android' ? '$0' : '$6'}
            >
                <SizableText size="$7">Add a manual punch</SizableText>
                <XStack gap="$5" jc="center" my="$4">
                    <YStack gap="$1">
                        <Label flexGrow={1} htmlFor="date">
                            Date
                        </Label>
                        <Button
                            id="date"
                            fontFamily="$tabular"
                            onPress={() => setDatePickerVisible(true)}
                        >
                            {fDateShort(date)}
                        </Button>
                    </YStack>
                    <YStack gap="$1">
                        <Label flexGrow={1} htmlFor="time">
                            Time
                        </Label>
                        <Button
                            id="time"
                            fontFamily="$tabular"
                            onPress={() => setTimePickerVisible(true)}
                        >
                            {fTime(date)}
                        </Button>
                    </YStack>
                </XStack>
                <XStack mb="$4" justifyContent="center">
                    <SizableText size="$1" color="$gray8">
                        This manual punch will not be sent to ADP
                    </SizableText>
                </XStack>
                <XStack justifyContent="flex-end" gap="$4">
                    <Button onPress={handleConfirm}>Confirm</Button>
                </XStack>
                <DateTimePickerModal
                    isVisible={datePickerVisible}
                    mode="date"
                    display="inline"
                    date={jsDate}
                    onConfirm={handleDatePicked}
                    onCancel={() => {
                        setDatePickerVisible(false);
                    }}
                />
                <DateTimePickerModal
                    isVisible={timePickerVisible}
                    mode="time"
                    date={jsDate}
                    onConfirm={handleTimePicked}
                    onCancel={() => {
                        setTimePickerVisible(false);
                    }}
                />
            </Sheet.Frame>
        </Sheet>
    );
}
