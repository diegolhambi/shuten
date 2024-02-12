import { config as configBase, createGenericFont } from '@tamagui/config';
import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';

const headingFont = createInterFont(
    {
        size: {
            5: 13,
            6: 15,
            9: 32,
            10: 44,
        },
        weight: {
            6: '400',
            7: '700',
        },
        letterSpacing: {
            5: 2,
            6: 1,
            7: 0,
            8: 0,
            9: -1,
            10: -1.5,
            12: -2,
            14: -3,
            15: -4,
        },
        // for native
        face: {
            700: { normal: 'InterBold' },
            800: { normal: 'InterBold' },
            900: { normal: 'InterBold' },
        },
    },
    { sizeLineHeight: (size) => Math.round(size * 1.1 + (size < 30 ? 10 : 5)) }
);

const bodyFont = createInterFont(
    {
        weight: {
            1: '400',
            7: '600',
        },
    },
    {
        sizeSize: (size) => Math.round(size),
        sizeLineHeight: (size) => Math.round(size * 1.1 + (size >= 12 ? 8 : 4)),
    }
);

const monoFont = createGenericFont(
    `"ui-monospace", "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
    {
        weight: {
            1: '500',
        },
        size: {
            1: 11,
            2: 12,
            3: 13,
            4: 14,
            5: 16,
            6: 18,
            7: 20,
            8: 22,
            9: 30,
            10: 42,
            11: 52,
            12: 62,
            13: 72,
            14: 92,
            15: 114,
            16: 124,
        },
    },
    {
        sizeLineHeight: (x) => x * 1.5,
    }
);

const tabularFont = createGenericFont(
    'InterTabular',
    {
        weight: {
            1: '500',
        },
        size: {
            1: 11,
            2: 12,
            3: 13,
            4: 14,
            5: 16,
            6: 18,
            7: 20,
            8: 22,
            9: 30,
            10: 42,
            11: 52,
            12: 62,
            13: 72,
            14: 92,
            15: 114,
            16: 124,
        },
    },
    {
        sizeLineHeight: (x) => x * 1.5,
    }
);

export const config = createTamagui({
    ...configBase,
    fonts: {
        body: bodyFont,
        heading: headingFont,
        mono: monoFont,
        tabular: tabularFont,
    },
});

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends Conf {}
}
