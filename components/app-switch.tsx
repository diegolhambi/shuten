import { getVariableValue, SizeTokens, styled } from '@tamagui/core';
import { getSize } from '@tamagui/get-token';
import { ThemeableStack, YStack } from '@tamagui/stacks';
import { createSwitch } from '@tamagui/switch';

const SwitchThumb = styled(ThemeableStack, {
    name: 'SwitchThumb',
    animation: 'quick',

    variants: {
        unstyled: {
            false: {
                size: '$true',
                backgroundColor: 'white',
                borderRadius: 1000,
            },
        },

        size: {
            '...size': (val) => {
                const size = getSwitchHeight(val);
                return {
                    height: size,
                    width: size,
                };
            },
        },
    } as const,

    defaultVariants: {
        unstyled: false,
    },
});

const getSwitchHeight = (val: SizeTokens) =>
    Math.round(getVariableValue(getSize(val)) * 0.65);

const getSwitchWidth = (val: SizeTokens) => getSwitchHeight(val) * 2;

const SwitchFrame = styled(YStack, {
    name: 'Switch',
    tag: 'button',

    variants: {
        unstyled: {
            false: {
                size: '$true',
                borderRadius: 1000,
                borderWidth: 2,
                borderColor: 'transparent',
                backgroundColor: '$background',

                focusStyle: {
                    borderColor: '$borderColorFocus',
                    outlineColor: '$borderColorFocus',
                    outlineStyle: 'solid',
                    outlineWidth: 1,
                },
            },
        },

        checked: {
            true: {
                backgroundColor: '$green7',
            },
        },

        frameWidth: {
            ':number': () => null,
        },

        size: {
            '...size': (val) => {
                const height = getSwitchHeight(val) + 4;
                const width = getSwitchWidth(val) + 4;
                return {
                    height,
                    minHeight: height,
                    width,
                };
            },
        },
    } as const,

    defaultVariants: {
        unstyled: false,
    },
});

export const AppSwitch = createSwitch({
    Frame: SwitchFrame,
    Thumb: SwitchThumb,
    acceptsUnstyled: true,
});
