import { Stack } from 'expo-router';
import { useCallback, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, SizableText, styled, XStack } from 'tamagui';

import { AppSwitch } from '../../components/app-switch';
import Item from '../../components/list-item';
import ConfigContext from '../../providers/config';
import NotificationContext from '../../providers/notification-manager';

const Title = styled(SizableText, {
    name: 'Title',
    size: '$7',
    p: '$4',
});

function ToggleItem(props: {
    title: string;
    subTitle?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}) {
    return (
        <Item>
            <Item.FrameText>
                <Item.Title>{props.title}</Item.Title>
                {props.subTitle && (
                    <Item.SubTitle>{props.subTitle}</Item.SubTitle>
                )}
            </Item.FrameText>
            <Item.FrameIcon>
                <AppSwitch
                    defaultChecked={props.checked || false}
                    checked={props.checked || false}
                    onCheckedChange={props.onCheckedChange}
                >
                    <AppSwitch.Thumb />
                </AppSwitch>
            </Item.FrameIcon>
        </Item>
    );
}

export default function Notifications() {
    const { config, setConfig } = useContext(ConfigContext);
    const { requestPermission } = useContext(NotificationContext);
    const { bottom } = useSafeAreaInsets();

    const handleChange = useCallback(
        (punch: 0 | 1 | 2 | 3, when: 'onTime' | 'early', value: boolean) => {
            console.log(punch, when, value);
            setConfig({
                ...config,
                notification: {
                    ...config.notification,
                    [punch]: {
                        ...config.notification[punch],
                        [when]: value,
                    },
                },
            });
        },
        [config],
    );

    return (
        <ScrollView>
            <Stack.Screen
                options={{ headerShown: true, title: 'Notifications' }}
            />
            <ToggleItem
                title="Enable notifications"
                subTitle="Receive the configured notifications"
                checked={config.notification.activated}
                onCheckedChange={(value) => {
                    if (value) {
                        requestPermission().then((result) => {
                            if (!result) {
                                setConfig({
                                    ...config,
                                    notification: {
                                        ...config.notification,
                                        activated: result,
                                    },
                                });
                            }
                        });
                    }

                    setConfig({
                        ...config,
                        notification: {
                            ...config.notification,
                            activated: value,
                        },
                    });
                }}
            />

            <Title>Start of work</Title>
            <ToggleItem
                title="On time"
                subTitle="Notify me at the start of work"
                checked={config.notification[0].onTime}
                onCheckedChange={(value) => handleChange(0, 'onTime', value)}
            />
            <ToggleItem
                title="Early"
                subTitle={`Notify me ${config.notification.howEarly} minutes early`}
                checked={config.notification[0].early}
                onCheckedChange={(value) => handleChange(0, 'early', value)}
            />

            <Title>Lunchtime</Title>
            <ToggleItem
                title="On time"
                subTitle="Notify me at the lunchtime"
                checked={config.notification[1].onTime}
                onCheckedChange={(value) => handleChange(1, 'onTime', value)}
            />
            <ToggleItem
                title="Early"
                subTitle={`Notify me ${config.notification.howEarly} minutes early`}
                checked={config.notification[1].early}
                onCheckedChange={(value) => handleChange(1, 'early', value)}
            />

            <Title>Return from lunch</Title>
            <ToggleItem
                title="On time"
                subTitle="Notify me at the return from lunch"
                checked={config.notification[2].onTime}
                onCheckedChange={(value) => handleChange(2, 'onTime', value)}
            />
            <ToggleItem
                title="Early"
                subTitle={`Notify me ${config.notification.howEarly} minutes early`}
                checked={config.notification[2].early}
                onCheckedChange={(value) => handleChange(2, 'early', value)}
            />

            <Title>End of work</Title>
            <ToggleItem
                title="On time"
                subTitle="Notify me at the end of work"
                checked={config.notification[3].onTime}
                onCheckedChange={(value) => handleChange(3, 'onTime', value)}
            />
            <ToggleItem
                title="Early"
                subTitle={`Notify me ${config.notification.howEarly} minutes early`}
                checked={config.notification[3].early}
                onCheckedChange={(value) => handleChange(3, 'early', value)}
            />
            <XStack
                w="100%"
                h={bottom}
            />
        </ScrollView>
    );
}
