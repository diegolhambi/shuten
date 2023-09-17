import { Fingerprint } from '@tamagui/lucide-icons';
import { Button, styled } from 'tamagui';

export const PunchButton = styled(Button, {
    name: 'PunchButton',
    icon: <Fingerprint size="$2.5" />,
    size: '$6',
    p: '$3.5',
    flexGrow: 0,
    circular: true,
});
