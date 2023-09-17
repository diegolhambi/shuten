import { openDatabase } from 'expo-sqlite';
import React, { createContext, useEffect } from 'react';

export const db = openDatabase('data.db');

type DatabaseContextData = {
    db: typeof db;
};

const DatabaseContext = createContext<DatabaseContextData>({ db });

type Props = {
    children?: React.ReactNode;
};

export function DatabaseProvider({ children }: Props) {
    useEffect(() => {
        db.transaction((tx) => {
            //tx.executeSql('DELETE FROM punches;');
            tx.executeSql(
                'CREATE TABLE IF NOT EXISTS punches (date DATE UNIQUE, type TEXT);',
            );
            tx.executeSql(
                'CREATE INDEX IF NOT EXISTS idx_punches_date ON punches(date);',
            );
        });
    }, []);

    return (
        <DatabaseContext.Provider value={{ db }}>
            {children}
        </DatabaseContext.Provider>
    );
}

export default DatabaseContext;
