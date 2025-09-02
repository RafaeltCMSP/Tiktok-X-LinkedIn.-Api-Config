
export enum Platform {
    LinkedIn = 'LinkedIn',
    Twitter = 'X (Twitter)',
    TikTok = 'TikTok',
}

export enum ActionType {
    GET_USER_INFO = 'User Info',
    GET_POSTS = 'Posts',
}

export interface AuthStatus {
    linkedIn: boolean;
    twitter: boolean;
    tikTok: boolean;
}

export interface LinkedInUser {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
}

export interface TwitterUser {
    user_id: string;
    username: string;
    name: string;
    description: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
    tweet_count: number;
}

export interface TikTokUser {
    open_id: string;
    union_id: string;
    display_name: string;
    avatar_url: string;
}

export interface Tweet {
    id: string;
    user_id: string;
    text: string;
    created_at_twitter: string;
    like_count: number;
    retweet_count: number;
}

export interface TikTokVideo {
    id: string;
    title: string;
    share_url: string;
    cover_image_url: string;
    like_count: number;
    comment_count: number;
    view_count: number;
}
