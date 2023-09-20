import { useToastController } from '@tamagui/toast';
import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { DateTime } from 'luxon';
import qs from 'qs';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { CookieJar } from 'tough-cookie';

type AdpContextData = {
    login(): Promise<AxiosInstance | undefined>;
    punch(): Promise<void>;
};

const AdpContext = createContext<AdpContextData>({} as AdpContextData);

type Props = {
    children?: React.ReactNode;
};

async function login() {
    const jar = new CookieJar();
    const http = wrapper(
        axios.create({
            jar,
            headers: {
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Cache-Control': 'max-age=0',
            },
            timeout: 3000,
            withCredentials: true,
        }),
    );

    // o retorno daqui talvez possa indicar se precisa mudar de senha
    // loginform.fcc 302 >
    // GET https://expert.brasil.adp.com/redirect/findway/ 302 >
    // GET https://expert.brasil.adp.com/expert/ 302 >
    // GET https://expert.brasil.adp.com/expert/v4/?lp=true 200
    await http.post(
        'https://expert.brasil.adp.com/ipclogin/1/loginform.fcc',
        qs.stringify({
            USER: 'user',
            PASSWORD: 'password',
            TARGET: '-SM-https%3A%2F%2Fexpert.brasil.adp.com%2Fexpert%2Fv4%2F',
        }),
    );

    const htmlSessionId = await http.get<string>(
        'https://expert.brasil.adp.com/expert/v4/',
    );

    const regexPattern =
        /<input\s+id="newexpert_sessionid"\s+type="hidden"\s+value="([^"]+)"/;
    const match = regexPattern.exec(htmlSessionId.data);

    if (match && match.length > 1) {
        const sessionId = match[1];
        jar.setCookie(
            `spsession=${sessionId}; path=/`,
            'https://expert.brasil.adp.com/expert/v4/',
        );

        http.defaults.headers.common = {
            ...http.defaults.headers.common,
            newexpert_sessionid: sessionId,
        };

        http.defaults.params = {
            lp: 'true',
        };

        http.defaults.baseURL = 'https://expert.brasil.adp.com/expert/api/';

        return http;
    } else {
        const incorrectPassword = htmlSessionId.data.indexOf(
            'Por favor, corrija suas credenciais de login e tente novamente',
        );

        if (incorrectPassword !== -1) {
            console.log('Incorrect password');
        } else {
            console.log('Value not found');
        }
    }
}

export function AdpProvider({ children }: Props) {
    const toast = useToastController();

    const [http, setHttp] = useState<AxiosInstance | undefined>();

    useEffect(() => {
        const initial = DateTime.now().toMillis();

        login().then((http) => {
            setHttp(http);

            toast.show(
                'Logged in ADP in ' +
                    (DateTime.now().toMillis() - initial) +
                    'ms',
            );
        });
    }, []);

    async function punch() {
        if (!http) {
            toast.show('Not logged in');
            return;
        }

        try {
            const initial = DateTime.now().toMillis();
            await http.post('punch/punchin', {
                punchType: 'SPDesktop',
                punchLatitude: null,
                punchLongitude: null,
                punchAction: null,
            });

            toast.show(
                'Punched in in ' + (DateTime.now().toMillis() - initial) + 'ms',
            );
        } catch (error) {
            toast.show('Error', {
                message: JSON.stringify(error),
            });
        }
    }

    const contextValue: AdpContextData = useMemo(() => {
        return {
            login,
            punch,
        };
    }, []);

    return (
        <AdpContext.Provider value={contextValue}>
            {children}
        </AdpContext.Provider>
    );
}

export default AdpContext;
