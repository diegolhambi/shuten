import CookieManager, { type Cookie } from '@react-native-cookies/cookies';
import { useToastController } from '@tamagui/toast';
import axios, { type RawAxiosRequestHeaders } from 'axios';
import { DateTime } from 'luxon';
import qs from 'qs';
import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';

import { useForeground } from '@/utils/app-state';
import { storage } from '@/utils/storage';
import { SchemaGetPunchIn } from '@/validations/get-punch-in';
import { SchemaPostPunchIn } from '@/validations/post-punch-in';
import { useConfig } from './config';

const AdpContext = createContext<AdpContextData>({
    state: 'Unknown',
} as AdpContextData);

export function useAdp() {
    return React.useContext(AdpContext);
}

export function AdpProvider({ children }: { children?: React.ReactNode }) {
    const { config } = useConfig();

    const [state, setState] = useState<AdpState>('Unknown');

    const initialized = useRef(false);
    const tries = useRef(0);

    useEffect(() => {
        switch (state) {
            case 'Unknown':
                revalidateClient();
                break;

            case 'NotLogged':
                if (tries.current >= 3) {
                    setState('NotConfigured');
                    return;
                }

                tries.current += 1;
                revalidateClient();
                break;

            case 'Logged':
            case 'NotConfigured':
                tries.current = 0;
                break;
        }
    }, [state]);

    const callRevalidateClient = useCallback(() => {
        setState('Unknown');
    }, [JSON.stringify(config)]);

    useForeground(callRevalidateClient);

    useEffect(() => {
        const interval = setInterval(callRevalidateClient, 3600000);

        return () => {
            clearInterval(interval);
        };
    }, [config]);

    useEffect(() => {
        if (initialized.current) {
            return;
        }

        initialized.current = true;
        revalidateClient();
    }, [config]);

    async function revalidateClient() {
        if (config.adp.activated === false) {
            setState('NotConfigured');
            return;
        }

        if (config.adp.user === '' || config.adp.password === '') {
            setState('NotConfigured');
            return;
        }

        setState('Logging');

        const sessionId = storage.getString('adp_newexpert_sessionid');

        if (!sessionId) {
            doLogin();
            return;
        }

        const expires = storage.getNumber('adp_session_expires') || 0;

        if (DateTime.now().toUnixInteger() > expires) {
            doLogin();
            return;
        }

        if (Platform.OS === 'ios') {
            const cookiesString = storage.getString('adp_cookies');
            const cookies: { [key: string]: Cookie } = cookiesString
                ? JSON.parse(cookiesString)
                : {};

            for (const [, cookie] of Object.entries(cookies)) {
                CookieManager.set(client.defaults.baseURL!, cookie);
            }
        }

        client.defaults.headers.common = {
            ...loggedHeaders(sessionId),
        };

        client.defaults.params = {
            lp: 'true',
        };

        const result = await client.get('punch/punchin/user-info');

        if (isLoggedOut(result.headers)) {
            await doLogin();
            return;
        }

        setState('Logged');
    }

    async function doLogin() {
        setState('Logging');

        try {
            const result = await login(config.adp.user, config.adp.password);

            if (result === 'Success') {
                setState('Logged');
            }

            if (result !== 'Success') {
                setState('NotLogged');
            }

            return result;
        } catch (error) {
            return 'Error';
        }
    }

    async function punch(isRetry = false) {
        if (!config.adp.activated) {
            return 'NotConfigured';
        }

        if (!client) {
            return 'NotInitialized';
        }

        try {
            const result = await client.post('punch/punchin', {
                punchType: 'SPMobile',
                punchLatitude: null,
                punchLongitude: null,
                punchAction: null,
            });

            if (isLoggedOut(result.headers)) {
                return 'NotLogged';
            }

            if (result.status !== 200) {
                return 'NotLogged';
            }

            SchemaPostPunchIn.parse(result.data);

            return 'Success';
        } catch (error) {
            if (!isRetry) {
                const result = await doLogin();

                if (result !== 'Success') {
                    return 'NotLogged';
                }

                return punch(true);
            }

            return 'Error';
        }
    }

    async function punches() {
        if (state !== 'Logged') {
            return state;
        }

        try {
            const result = await client.get('punch/punchin');

            if (isLoggedOut(result.headers)) {
                return 'NotLogged';
            }

            const data = SchemaGetPunchIn.parse(result.data);

            const punches = data.lastPunches.map((punch) => {
                return DateTime.fromISO(punch.punchDateTime);
            });

            return punches;
        } catch (error) {
            return 'Error';
        }
    }

    const contextValue: AdpContextData = useMemo(() => {
        return {
            state,
            login,
            punches,
            punch,
        };
    }, [config.adp.activated, state]);

    return (
        <AdpContext.Provider value={contextValue}>
            {children}
        </AdpContext.Provider>
    );
}

type AdpContextData = {
    state: AdpState;
    login(user: string, password: string): Promise<LoginResult>;
    punches(): Promise<PunchesResult>;
    punch(): Promise<PunchResult>;
};

type AdpState =
    | 'Unknown'
    | 'NotInitialized'
    | 'NotConfigured'
    | 'NotLogged'
    | 'Logging'
    | 'Logged';

type PunchesResult = 'Error' | AdpState | DateTime[];
export type PunchResult = 'Error' | 'Success' | AdpState;

type LoginResult =
    | 'Success'
    | 'Error'
    | 'InvalidCredentials'
    | 'SessionIdNotFound'
    | 'PasswordWillExpire'
    | 'PasswordExpired';

const defaultHeaders: RawAxiosRequestHeaders = {
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Cache-Control': 'max-age=0',
};

const client = axios.create({
    withCredentials: true,
    baseURL: 'https://expert.cloud.brasil.adp.com/expert2/api/',
    headers: defaultHeaders,
    timeout: 3000,
});

client.interceptors.response.use(
    (response) => {
        if (Platform.OS === 'ios') {
            CookieManager.getAll().then((cookies) => {
                storage.set('adp_cookies', JSON.stringify(cookies));
            });
        }

        if (Platform.OS === 'android') {
            CookieManager.flush();
        }

        return response;
    },
    (error) => {
        console.log(error);
        return Promise.reject(error);
    }
);

function loggedHeaders(sessionId: string): RawAxiosRequestHeaders {
    return {
        ...defaultHeaders,
        Newexpert_sessionid: sessionId,
        Origin: 'https://expert.cloud.brasil.adp.com',
        Referer: 'https://expert.cloud.brasil.adp.com/expert2/v4/?lp=true',
    };
}

function isLoggedOut(headers: RawAxiosRequestHeaders): boolean {
    return (
        headers['content-type'] !== 'application/json' &&
        headers['content-location'] === 'loginform.html.pt-br'
    );
}

function cleanSession() {
    storage.delete('adp_session_expires');
    storage.delete('adp_newexpert_sessionid');
    storage.delete('adp_cookies');
    CookieManager.clearAll();
    client.defaults.headers.common = {
        ...defaultHeaders,
    };
}

async function login(user: string, password: string): Promise<LoginResult> {
    cleanSession();

    try {
        // o retorno daqui talvez possa indicar se precisa mudar de senha
        // loginform.fcc 302 >
        // GET https://expert.cloud.brasil.adp.com/redirect/findway/ 302 >
        // GET https://expert.cloud.brasil.adp.com/expert2/ 302 >
        // GET https://expert.cloud.brasil.adp.com/expert2/v4/?lp=true 200
        let htmlLogin = await client.post<string>(
            'https://expert.cloud.brasil.adp.com/ipclogin/1/loginform.fcc',
            qs.stringify({
                USER: user,
                PASSWORD: password,
                TARGET: '-SM-http%3a%2f%2fexpert%2ecloud%2ebrasil%2eadp%2ecom%2fexpert2%2f',
            })
        );
        /*
        console.log(htmlLogin.headers);

        console.log(
            htmlLogin.data
                .replace(/<head>[\s\S]*<\/head>/gi, '')
                .replace(
                    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                    '',
                )
                .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ''),
        );
        */
        if (
            htmlLogin.data.indexOf(
                'Por favor, corrija suas credenciais de login e tente novamente'
            ) !== -1 ||
            htmlLogin.headers['content-location'] === 'loginform.html.pt-br'
        ) {
            return 'InvalidCredentials';
        }

        const passwordFind =
            /<p>Sua senha irá expirar em menos de (\d+) dias.<\/p>/;
        const matchPassword = passwordFind.exec(htmlLogin.data);
        let passwordWillExpire = false;

        if (matchPassword && matchPassword.length > 1) {
            passwordWillExpire = true;
            htmlLogin = await client.get<string>('?lp=true');
        }

        const regexPattern =
            /<input\s+id="newexpert_sessionid"\s+type="hidden"\s+value="([^"]+)"/;
        const match = regexPattern.exec(htmlLogin.data);

        if (match && match.length > 1) {
            const sessionId = match[1]!;

            client.defaults.headers.common = {
                ...defaultHeaders,
                Newexpert_sessionid: sessionId,
                Origin: 'https://expert.cloud.brasil.adp.com',
                Referer:
                    'https://expert.cloud.brasil.adp.com/expert2/v4/?lp=true',
            };

            client.defaults.params = {
                lp: 'true',
            };

            storage.set(
                'adp_session_expires',
                DateTime.now().plus({ hours: 2 }).toUnixInteger()
            );
            storage.set('adp_newexpert_sessionid', sessionId);

            if (passwordWillExpire) {
                return 'PasswordWillExpire';
            }

            return 'Success';
        }

        return 'SessionIdNotFound';
    } catch (error) {
        cleanSession();
        return 'Error';
    }
}
