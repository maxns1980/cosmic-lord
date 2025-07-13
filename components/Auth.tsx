
import React, { useState } from 'react';

interface AuthProps {
    onLoginSuccess: (token: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const url = isLogin ? 'http://localhost:5000/api/users/login' : 'http://localhost:5000/api/users/register';
        const body = isLogin ? { username, password } : { username, email, password };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Wystąpił błąd.');
            }

            onLoginSuccess(data.token);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nieznany błąd serwera.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/seed/auth/1920/1080')"}}>
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 bg-opacity-90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        {isLogin ? 'Witaj, Władco!' : 'Dołącz do Podboju'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {isLogin ? 'Zaloguj się do swojego imperium' : 'Stwórz nowe konto i rozpocznij grę'}
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {!isLogin && (
                         <div>
                            <label htmlFor="email-address" className="sr-only">Adres email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                                placeholder="Adres email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="username" className="sr-only">Nazwa użytkownika</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                            placeholder="Nazwa użytkownika"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Hasło</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                            placeholder="Hasło"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-900 bg-opacity-50 p-3 rounded-md text-center">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:bg-gray-500"
                        >
                            {isLoading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Zarejestruj się')}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-medium text-cyan-400 hover:text-cyan-300">
                        {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;