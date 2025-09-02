
import React, { useState, useCallback, useEffect } from 'react';
import { SocialCard } from './components/SocialCard';
import { JsonViewer } from './components/JsonViewer';
import { Header } from './components/Header';
import { apiService } from './services/apiService';
import { Platform, ActionType } from './types';
import type { LinkedInUser, TwitterUser, TikTokUser, AuthStatus } from './types';

const App: React.FC = () => {
    const [authStatus, setAuthStatus] = useState<AuthStatus>({ linkedIn: false, twitter: false, tikTok: false });
    const [linkedInUser, setLinkedInUser] = useState<LinkedInUser | null>(null);
    const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);
    const [tikTokUser, setTikTokUser] = useState<TikTokUser | null>(null);

    const [apiResult, setApiResult] = useState<object | string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activePlatform, setActivePlatform] = useState<Platform | null>(null);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setApiResult("Checking authentication status...");
                const status = await apiService.getAuthStatus();
                setAuthStatus(status);

                if (status.linkedIn) {
                    const res: { data: LinkedInUser } = await apiService.fetchData(Platform.LinkedIn, ActionType.GET_USER_INFO);
                    setLinkedInUser(res.data);
                }
                if (status.twitter) {
                    const res: { data: TwitterUser } = await apiService.fetchData(Platform.Twitter, ActionType.GET_USER_INFO);
                    setTwitterUser(res.data);
                }
                if (status.tikTok) {
                    const res: { data: { user: TikTokUser } } = await apiService.fetchData(Platform.TikTok, ActionType.GET_USER_INFO);
                    setTikTokUser(res.data.user);
                }
                setApiResult("Ready. Select an action.");
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                setApiResult({ error: "Failed to check auth status. Is the server running?", details: errorMessage });
            } finally {
                setIsLoading(false);
            }
        };
        checkAuthStatus();
    }, []);


    const handleConnect = useCallback((platform: Platform) => {
        const platformSlug = platform === Platform.Twitter ? 'twitter' : platform.toLowerCase();
        window.location.href = `/auth/${platformSlug}/login`;
    }, []);

    const handleDisconnect = useCallback(async (platform: Platform) => {
        // Fix: Use a mapping object to ensure `platformSlug` has the correct literal type 
        // ('linkedin' | 'twitter' | 'tiktok'), which is required by `apiService.logout`. 
        // This resolves the TypeScript error where `platformSlug` was inferred as a generic `string`.
        const platformSlugMap: Record<Platform, 'linkedin' | 'twitter' | 'tiktok'> = {
            [Platform.LinkedIn]: 'linkedin',
            [Platform.Twitter]: 'twitter',
            [Platform.TikTok]: 'tiktok',
        };
        const platformSlug = platformSlugMap[platform];

        try {
            setIsLoading(true);
            setActivePlatform(platform);
            setApiResult(`Disconnecting from ${platform}...`);
            await apiService.logout(platformSlug);
            // Reload the page to clear server session and update state
            window.location.reload();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            setApiResult({ error: `Failed to disconnect from ${platform}`, details: errorMessage });
            setIsLoading(false);
        }
    }, []);
    
    const handleFetchData = useCallback(async (platform: Platform, action: ActionType) => {
        setIsLoading(true);
        setActivePlatform(platform);
        setApiResult(`Fetching ${action} from ${platform}...`);

        try {
            const data = await apiService.fetchData(platform, action);
            setApiResult(data);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            setApiResult({ error: "Failed to fetch data", details: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, []);


    return (
        <div className="min-h-screen bg-base-bg text-base-text antialiased">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <SocialCard
                        platform={Platform.LinkedIn}
                        user={linkedInUser}
                        isConnected={authStatus.linkedIn}
                        onConnect={() => handleConnect(Platform.LinkedIn)}
                        onDisconnect={() => handleDisconnect(Platform.LinkedIn)}
                        onFetchData={handleFetchData}
                        isActive={activePlatform === Platform.LinkedIn}
                    />
                    <SocialCard
                        platform={Platform.Twitter}
                        user={twitterUser}
                        isConnected={authStatus.twitter}
                        onConnect={() => handleConnect(Platform.Twitter)}
                        onDisconnect={() => handleDisconnect(Platform.Twitter)}
                        onFetchData={handleFetchData}
                        isActive={activePlatform === Platform.Twitter}
                    />
                    <SocialCard
                        platform={Platform.TikTok}
                        user={tikTokUser}
                        isConnected={authStatus.tikTok}
                        onConnect={() => handleConnect(Platform.TikTok)}
                        onDisconnect={() => handleDisconnect(Platform.TikTok)}
                        onFetchData={handleFetchData}
                        isActive={activePlatform === Platform.TikTok}
                    />
                </div>
                
                <JsonViewer data={apiResult} isLoading={isLoading} />
            </main>
        </div>
    );
};

export default App;