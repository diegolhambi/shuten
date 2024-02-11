import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'tamagui';

export const AreaView = styled(SafeAreaView, {
    name: 'AXStackreaView',
    flex: 1,
    edges: ['top', 'right', 'left'],
    backgroundColor: '$backgroundStrong',
});
