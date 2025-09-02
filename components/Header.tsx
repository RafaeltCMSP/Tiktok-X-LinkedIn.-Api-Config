
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-base-card/50 backdrop-blur-sm border-b border-base-border sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
                <h1 className="text-2xl font-bold text-white">
                    <span role="img" aria-label="hub icon" className="mr-2">🌐</span>
                    Social Hub Dashboard
                </h1>
                <p className="text-sm text-base-muted">
                    A unified interface for LinkedIn, X (Twitter), and TikTok integrations.
                </p>
            </div>
        </header>
    );
};
