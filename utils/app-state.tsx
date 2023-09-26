import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useForeground(fn: () => void) {
    const appState = useRef(AppState.currentState);

    function handleState(nextAppState: AppStateStatus) {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            fn();
        }

        appState.current = nextAppState;
    }

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleState);

        return () => {
            subscription.remove();
        };
    }, []);
}
