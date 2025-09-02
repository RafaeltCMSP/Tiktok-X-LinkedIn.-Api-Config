
import React from 'react';

interface JsonViewerProps {
    data: object | string | null;
    isLoading: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, isLoading }) => {
    const content = isLoading 
        ? "Loading..."
        : data 
        ? JSON.stringify(data, null, 2)
        : "Select an action to see the result here...";

    return (
        <div className="bg-base-card rounded-lg border border-base-border shadow-lg">
            <div className="px-4 py-2 border-b border-base-border">
                <h3 className="text-lg font-semibold text-white">API Response</h3>
            </div>
            <div className="p-4">
                <pre className={`w-full h-96 overflow-auto text-sm bg-base-bg p-4 rounded-md text-slate-300 transition-opacity duration-300 ${isLoading ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
                    <code>{content}</code>
                </pre>
            </div>
        </div>
    );
};
