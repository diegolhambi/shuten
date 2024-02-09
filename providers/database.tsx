import { openDatabaseSync } from 'expo-sqlite/next';
import React, { createContext, useEffect } from 'react';

export const db = openDatabaseSync('data.db');

type DatabaseContextData = {
    db: typeof db;
};

const DatabaseContext = createContext<DatabaseContextData>({ db });

type Props = {
    children?: React.ReactNode;
};

export function DatabaseProvider({ children }: Props) {
    useEffect(() => {
        db.execAsync(`
            CREATE TABLE IF NOT EXISTS punches (date DATE UNIQUE, type TEXT);
            CREATE INDEX IF NOT EXISTS idx_punches_date ON punches(date);
        `);
    }, []);

    return (
        <DatabaseContext.Provider value={{ db }}>
            {children}
        </DatabaseContext.Provider>
    );
}

export default DatabaseContext;
