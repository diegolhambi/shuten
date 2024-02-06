import { config as configBase } from '@tamagui/config';
import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';

const headingFont = createInterFont({
    color: {
        true: '$color',
    },
    face: {
        700: { normal: 'InterBold' },
    },
});

const bodyFont = createInterFont({
    color: {
        true: '$color',
    },
    face: {
        700: { normal: 'InterBold' },
    },
});

export const config = createTamagui({
    ...configBase,
    fonts: {
        body: bodyFont,
        heading: headingFont,
    },
});

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends Conf {}
}
