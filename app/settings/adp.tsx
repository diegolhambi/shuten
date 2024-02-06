import { useToastController } from '@tamagui/toast';
import { Stack } from 'expo-router';
import { DateTime } from 'luxon';
import { useContext, useEffect, useState } from 'react';
import {
    Button,
    Input,
    Label,
    SizableText,
    Spinner,
    XStack,
    YStack,
} from 'tamagui';

import { AppSwitch } from '../../components/app-switch';
import Item from '../../components/list-item';
import AdpContext from '../../providers/adp';
import ConfigContext from '../../providers/config';
import { useDebounce } from '../../utils/limiter';

export default function Adp() {
    const { config, setConfig } = useContext(ConfigContext);
    const { login } = useContext(AdpContext);
    const toast = useToastController();

    const [showPassword, setShowPassword] = useState(true);

    const [user, setUser] = useState(config.adp.user);
    const [password, setPassword] = useState(config.adp.password);

    const [testing, setTesting] = useState(false);

    const debounced = {
        user: useDebounce(user, 1000),
        password: useDebounce(password, 1000),
    };

    useEffect(() => {
        if (
            config.adp.user === debounced.user &&
            config.adp.password === debounced.password
        ) {
            return;
        }

        setConfig({
            ...config,
            adp: {
                ...config.adp,
                ...debounced,
            },
        });
    }, [debounced]);

    function testLogin() {
        if (testing) {
            return;
        }

        setTesting(true);

        const initial = DateTime.now().toMillis();

        login(user, password).then((result) => {
            setTesting(false);
            switch (result) {
                case 'Success':
                    toast.show('The credentials are valid', {
                        message: `In ${DateTime.now().toMillis() - initial}ms`,
                    });
                    break;
                case 'InvalidCredentials':
                    toast.show('The credentials are invalid', {
                        message: `In ${DateTime.now().toMillis() - initial}ms`,
                    });
                    break;
                default:
                    toast.show('Error');
                    break;
            }
        });
    }

    return (
        <>
            <Stack.Screen
                options={{ headerShown: true, title: 'ADP Integration' }}
            />
            <Item>
                <Item.FrameText>
                    <Item.Title>Enable integration</Item.Title>
                    <Item.SubTitle>
                        Automatically make punches on ADP
                    </Item.SubTitle>
                </Item.FrameText>
                <Item.FrameIcon>
                    <AppSwitch
                        checked={config.adp.activated}
                        onCheckedChange={(value) => {
                            setConfig({
                                ...config,
                                adp: {
                                    ...config.adp,
                                    activated: value,
                                },
                            });
                        }}
                    >
                        <AppSwitch.Thumb />
                    </AppSwitch>
                </Item.FrameIcon>
            </Item>
            <YStack p="$4" space="$4">
                <SizableText size="$7">Credentials</SizableText>
                <YStack space="$2">
                    <Label>Username</Label>
                    <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={user}
                        onChangeText={setUser}
                    />
                </YStack>
                <YStack space="$2">
                    <Label>Password</Label>
                    <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry={showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                </YStack>
                <XStack space="$2" alignItems="center">
                    <AppSwitch
                        onCheckedChange={() => setShowPassword(!showPassword)}
                    >
                        <AppSwitch.Thumb />
                    </AppSwitch>
                    <Label>Show password</Label>
                </XStack>
                <XStack
                    space="$2"
                    alignItems="center"
                    justifyContent="flex-end"
                >
                    {testing ? (
                        <Button disabled>
                            <Spinner />
                        </Button>
                    ) : (
                        <Button onPress={testLogin}>Test credentials</Button>
                    )}
                </XStack>
            </YStack>
        </>
    );
}
