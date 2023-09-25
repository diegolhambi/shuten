import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function useThrottle<T>(value: T, interval = 500) {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const lastUpdated = useRef(0);

    useEffect(() => {
        const now = Date.now();

        if (lastUpdated.current && now >= lastUpdated.current + interval) {
            lastUpdated.current = now;
            setThrottledValue(value);
        } else {
            const id = window.setTimeout(() => {
                lastUpdated.current = now;
                setThrottledValue(value);
            }, interval);

            return () => window.clearTimeout(id);
        }
    }, [value, interval]);

    return throttledValue;
}
