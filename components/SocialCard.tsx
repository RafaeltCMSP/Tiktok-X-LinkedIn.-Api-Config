
import React from 'react';
import type { LinkedInUser, TwitterUser, TikTokUser } from '../types';
import { Platform, ActionType } from '../types';
import { LinkedInIcon, TwitterIcon, TikTokIcon } from './icons/SocialIcons';

type User = LinkedInUser | TwitterUser | TikTokUser | null;

interface SocialCardProps {
    platform: Platform;
    user: User;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onFetchData: (platform: Platform, action: ActionType) => void;
    isActive: boolean;
}

const platformConfig = {
    [Platform.LinkedIn]: {
        Icon: LinkedInIcon,
        colorClass: 'bg-brand-linkedin',
        hoverColorClass: 'hover:bg-brand-linkedin/90',
        borderColorClass: 'border-brand-linkedin',
        description: 'Connect your professional network using OpenID Connect.',
        postActionName: 'Posts',
    },
    [Platform.Twitter]: {
        Icon: TwitterIcon,
        colorClass: 'bg-brand-twitter',
        hoverColorClass: 'hover:bg-brand-twitter/90',
        borderColorClass: 'border-brand-twitter',
        description: 'Integrate with X using OAuth 2.0 and PKCE.',
        postActionName: 'Tweets',
    },
    [Platform.TikTok]: {
        Icon: TikTokIcon,
        colorClass: 'bg-brand-tiktok',
        hoverColorClass: 'hover:bg-brand-tiktok/90',
        borderColorClass: 'border-brand-tiktok',
        description: 'Link your TikTok account to view videos and profile info.',
        postActionName: 'Videos',
    },
};

const UserDisplay: React.FC<{ platform: Platform, user: User }> = ({ platform, user }) => {
    if (!user) return null;

    let avatar, name, handle;
    if ('picture' in user) { // LinkedInUser
        avatar = user.picture;
        name = user.name;
        handle = user.email;
    } else if ('username' in user) { // TwitterUser
        avatar = user.avatar_url;
        name = user.name;
        handle = `@${user.username}`;
    } else { // TikTokUser
        avatar = user.avatar_url;
        name = user.display_name;
        handle = user.open_id.substring(0, 15) + '...';
    }

    return (
        <div className="flex items-center gap-4">
            <img src={avatar} alt="User Avatar" className="w-12 h-12 rounded-full border-2 border-base-border" />
            <div>
                <p className="font-bold text-white">{name}</p>
                <p className="text-sm text-base-muted">{handle}</p>
            </div>
        </div>
    );
};

export const SocialCard: React.FC<SocialCardProps> = ({ platform, user, isConnected, onConnect, onDisconnect, onFetchData, isActive }) => {
    const config = platformConfig[platform];

    return (
        <div className={`bg-base-card rounded-xl border border-base-border shadow-lg transition-all duration-300 ${isActive ? `ring-2 ${config.borderColorClass}` : 'ring-0'}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <config.Icon className="w-8 h-8" />
                        <h2 className="text-xl font-bold text-white">{platform}</h2>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>

                {!isConnected ? (
                    <div>
                        <p className="text-base-muted mb-6 h-10">{config.description}</p>
                        <button onClick={onConnect} className={`w-full font-bold py-2 px-4 rounded-lg text-white transition-transform transform hover:scale-105 ${config.colorClass} ${config.hoverColorClass}`}>
                            Connect
                        </button>
                    </div>
                ) : (
                    <div>
                        <UserDisplay platform={platform} user={user} />
                        <div className="mt-6 space-y-3">
                            <button onClick={() => onFetchData(platform, ActionType.GET_USER_INFO)} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Get User Info
                            </button>
                            <button onClick={() => onFetchData(platform, ActionType.GET_POSTS)} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Get {config.postActionName}
                            </button>
                            <button onClick={onDisconnect} className="w-full bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Disconnect
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
