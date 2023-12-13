import CookieManager, { Cookie } from '@react-native-cookies/cookies';
import { useToastController } from '@tamagui/toast';
import axios, { RawAxiosRequestHeaders } from 'axios';
import { DateTime } from 'luxon';
import qs from 'qs';
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';

import { useForeground } from '../utils/app-state';
import { storage } from '../utils/storage';
import { SchemaGetPunchIn } from '../validations/get-punch-in';
import { SchemaPostPunchIn } from '../validations/post-punch-in';
import ConfigContext from './config';

type AdpContextData = {
    login(user: string, password: string): Promise<LoginResult>;
    punches(): Promise<DateTime[] | undefined>;
    punch(): Promise<void>;
};

const AdpContext = createContext<AdpContextData>({} as AdpContextData);

type Props = {
    children?: React.ReactNode;
};

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
    baseURL: 'https://expert.brasil.adp.com/expert/api/',
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
    },
);

function loggedHeaders(sessionId: string): RawAxiosRequestHeaders {
    return {
        ...defaultHeaders,
        Newexpert_sessionid: sessionId,
        Origin: 'https://expert.brasil.adp.com',
        Referer: 'https://expert.brasil.adp.com/expert/v4/?lp=true',
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
        // GET https://expert.brasil.adp.com/redirect/findway/ 302 >
        // GET https://expert.brasil.adp.com/expert/ 302 >
        // GET https://expert.brasil.adp.com/expert/v4/?lp=true 200
        let htmlLogin = await client.post<string>(
            'https://expert.brasil.adp.com/ipclogin/1/loginform.fcc',
            qs.stringify({
                USER: user,
                PASSWORD: password,
                TARGET: '-SM-https%3A%2F%2Fexpert.brasil.adp.com%2Fredirect%2Ffindway%2F',
            }),
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
                'Por favor, corrija suas credenciais de login e tente novamente',
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
                Origin: 'https://expert.brasil.adp.com',
                Referer: 'https://expert.brasil.adp.com/expert/v4/?lp=true',
            };

            client.defaults.params = {
                lp: 'true',
            };

            storage.set(
                'adp_session_expires',
                DateTime.now().plus({ hours: 2 }).toUnixInteger(),
            );
            storage.set('adp_newexpert_sessionid', sessionId);

            if (passwordWillExpire) {
                return 'PasswordWillExpire';
            }

            return 'Success';
        } else {
            return 'SessionIdNotFound';
        }
    } catch (error) {
        cleanSession();
        console.log('Adp login error', error);
        return 'Error';
    }
}

export function AdpProvider({ children }: Props) {
    const { config } = useContext(ConfigContext);
    const toast = useToastController();

    const [logged, setLogged] = useState(false);

    const initialized = useRef(false);
    const revalidate = useRef(0);

    useForeground(() => {
        if (initialized.current) {
            initialized.current = false;
            revalidate.current++;
        }
    });

    useEffect(() => {
        const interval = setInterval(() => {
            if (initialized.current) {
                revalidateClient();
            }
        }, 3600000);

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
    }, [config, revalidate.current]);

    function revalidateClient() {
        if (config.adp.activated === false) {
            return;
        }

        if (config.adp.user === '' || config.adp.password === '') {
            return;
        }

        setLogged(false);

        const initial = DateTime.now().toMillis();

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

        client.get('punch/punchin/user-info').then((result) => {
            if (isLoggedOut(result.headers)) {
                doLogin();
                return;
            }

            toast.show('Client rehydrated', {
                message: `In ${DateTime.now().toMillis() - initial}ms`,
            });

            setLogged(true);
        });
    }

    function doLogin() {
        const initial = DateTime.now().toMillis();
        setLogged(false);

        login(config.adp.user, config.adp.password).then((result) => {
            const time = DateTime.now().toMillis() - initial;

            switch (result) {
                case 'Success':
                    toast.show(`Logged in ADP in ${time}ms`);
                    setLogged(true);
                    break;
                case 'InvalidCredentials':
                    toast.show('Invalid credentials');
                    break;
                case 'SessionIdNotFound':
                    toast.show('Session ID not found');
                    break;
                case 'PasswordWillExpire':
                    toast.show('ADP Password will expire soon');
                    break;
                case 'PasswordExpired':
                    toast.show('Password expired');
                    break;
                default:
                    toast.show('Error');
                    break;
            }
        });
    }

    async function punch() {
        if (!config.adp.activated) {
            return;
        }

        if (!client) {
            toast.show('Punch not registered in ADP');
            return;
        }

        try {
            const initial = DateTime.now().toMillis();
            const result = await client.post('punch/punchin', {
                punchType: 'SPMobile',
                punchLatitude: null,
                punchLongitude: null,
                punchAction: null,
            });

            if (isLoggedOut(result.headers)) {
                toast.show('Punch not registered in ADP');
                return;
            }

            if (result.status !== 200) {
                toast.show('Punch not registered in ADP');
                return;
            }

            SchemaPostPunchIn.parse(result.data);

            toast.show('Punched in', {
                message: `In ${DateTime.now().toMillis() - initial}ms`,
            });
        } catch (error) {
            toast.show('Error', {
                message: JSON.stringify(error),
            });
        }
    }

    async function punches() {
        if (!client) {
            toast.show('Punch not registered in ADP');
            return;
        }

        try {
            const result = await client.get('punch/punchin');

            if (isLoggedOut(result.headers)) {
                toast.show('Error, logged out');
                console.log(result.data);
                return;
            }

            const data = SchemaGetPunchIn.parse(result.data);

            const punches = data.lastPunches.map((punch) => {
                return DateTime.fromISO(punch.punchDateTime);
            });

            return punches;
        } catch (error) {
            toast.show('Error', {
                message: JSON.stringify(error),
            });
        }
    }

    const contextValue: AdpContextData = useMemo(() => {
        return {
            login,
            punches,
            punch,
        };
    }, [config.adp.activated, logged]);

    return (
        <AdpContext.Provider value={contextValue}>
            {children}
        </AdpContext.Provider>
    );
}

export default AdpContext;
