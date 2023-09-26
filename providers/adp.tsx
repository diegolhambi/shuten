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

import { useForeground } from '../utils/app-state';
import { storage } from '../utils/storage';
import ConfigContext from './config';

type AdpContextData = {
    login(user: string, password: string): Promise<LoginResult>;
    test(): Promise<void>;
    punch(): Promise<void>;
};

type AdpSessionId = {
    expires_at: number;
    value: string;
};

const AdpContext = createContext<AdpContextData>({} as AdpContextData);

type Props = {
    children?: React.ReactNode;
};

type LoginResult =
    | 'Success'
    | 'Error'
    | 'InvalidCredentials'
    | 'SessionIdNotFound';

const defaultHeaders: RawAxiosRequestHeaders = {
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Cache-Control': 'max-age=0',
};
const client = axios.create({
    baseURL: 'https://expert.brasil.adp.com/expert/api/',
    headers: defaultHeaders,
    timeout: 3000,
    withCredentials: true,
});

function loggedHeaders(sessionId: string): RawAxiosRequestHeaders {
    return {
        ...defaultHeaders,
        Newexpert_sessionid: sessionId,
        Origin: 'https://expert.brasil.adp.com',
        Referer: 'https://expert.brasil.adp.com/expert/v4/?lp=true',
    };
}

async function login(user: string, password: string): Promise<LoginResult> {
    try {
        // o retorno daqui talvez possa indicar se precisa mudar de senha
        // loginform.fcc 302 >
        // GET https://expert.brasil.adp.com/redirect/findway/ 302 >
        // GET https://expert.brasil.adp.com/expert/ 302 >
        // GET https://expert.brasil.adp.com/expert/v4/?lp=true 200
        const htmlLogin = await client.post<string>(
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

            const adp_session_id: AdpSessionId = {
                expires_at: DateTime.now().plus({ hours: 2 }).toUnixInteger(),
                value: sessionId,
            };

            storage.set('adp_session_id', JSON.stringify(adp_session_id));

            return 'Success';
        } else {
            client.defaults.params = {};
            client.defaults.headers.common = { ...defaultHeaders };
            return 'SessionIdNotFound';
        }
    } catch (error) {
        client.defaults.params = {};
        client.defaults.headers.common = { ...defaultHeaders };
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
                default:
                    toast.show('Error');
                    break;
            }
        });
    }

    useEffect(() => {
        if (config.adp.activated === false) {
            return;
        }

        if (config.adp.user === '' || config.adp.password === '') {
            return;
        }

        if (initialized.current) {
            return;
        }

        initialized.current = true;
        setLogged(false);

        const initial = DateTime.now().toMillis();

        const value = storage.getString('adp_session_id');

        if (!value) {
            doLogin();
            return;
        }

        const parsed: AdpSessionId = JSON.parse(value);

        if (DateTime.now().toUnixInteger() > parsed.expires_at) {
            storage.delete('adp_session_id');
            doLogin();
            return;
        }

        client.defaults.headers.common = {
            ...loggedHeaders(parsed.value),
        };

        client.defaults.params = {
            lp: 'true',
        };

        toast.show('Client rehydrated', {
            message: `In ${DateTime.now().toMillis() - initial}ms`,
        });

        setLogged(true);
    }, [config, revalidate.current]);

    async function punch() {
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

            if (
                result.headers['content-type'] !== 'application/json' &&
                result.headers['content-location'] === 'loginform.html.pt-br'
            ) {
                toast.show('Error, logged out');
                return;
            }

            toast.show('Punched in', {
                message: `In ${DateTime.now().toMillis() - initial}ms`,
            });
        } catch (error) {
            toast.show('Error', {
                message: JSON.stringify(error),
            });
        }
    }

    async function test() {
        if (!client) {
            toast.show('Punch not registered in ADP');
            return;
        }

        try {
            const initial = DateTime.now().toMillis();
            const result = await client.get('punch/punchin');

            if (
                result.headers['content-type'] !== 'application/json' &&
                result.headers['content-location'] === 'loginform.html.pt-br'
            ) {
                toast.show('Error, logged out');
                return;
            }

            toast.show('Punched in', {
                message: `In ${DateTime.now().toMillis() - initial}ms`,
            });
        } catch (error) {
            toast.show('Error', {
                message: JSON.stringify(error),
            });
        }
    }

    const contextValue: AdpContextData = useMemo(() => {
        return {
            login,
            test,
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
