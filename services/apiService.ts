
import { Platform, ActionType } from '../types';
import type { AuthStatus } from '../types';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || errorBody.message || 'API request failed');
        } else {
            const textError = await response.text();
            throw new Error(textError || 'API request failed with status: ' + response.status);
        }
    }
    
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    // Return an empty object for non-json success responses if needed, or handle as text
    return {} as T;

  } catch (error) {
    console.error(`API call to ${url} failed:`, error);
    throw error;
  }
}

export const apiService = {
    getAuthStatus: (): Promise<AuthStatus> => fetchApi('/api/auth/status'),
    
    logout: (platform: 'linkedin' | 'twitter' | 'tiktok'): Promise<void> => fetchApi(`/auth/logout/${platform}`),

    fetchData: async (platform: Platform, action: ActionType): Promise<any> => {
        const platformSlug = platform === Platform.Twitter ? 'twitter' : platform.toLowerCase();
        
        let actionSlug: string;
        if (action === ActionType.GET_USER_INFO) {
            actionSlug = 'userinfo';
        } else {
            switch(platform) {
                case Platform.Twitter: actionSlug = 'tweets'; break;
                case Platform.TikTok: actionSlug = 'videos'; break;
                case Platform.LinkedIn:
                    // This case is handled client-side to avoid an unnecessary API call
                    return { message: "Note: Posts cannot be accessed via LinkedIn's OpenID Connect. This is a platform limitation." };
                default: throw new Error('Invalid action for platform');
            }
        }
        
        return fetchApi(`/api/data/${platformSlug}/${actionSlug}`);
    }
};
