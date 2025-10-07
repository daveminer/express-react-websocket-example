'use client';

import React, { useState } from 'react';
import CreateChildBoardForm from './CreateChildBoardForm';

interface CreateChildBoardButtonProps {
    parentId: number;
    level?: number;
}

export default function CreateChildBoardButton({ parentId, level = 0 }: CreateChildBoardButtonProps) {
    const [showForm, setShowForm] = useState(false);

    const handleButtonClick = () => {
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
    };

    if (showForm) {
        return <CreateChildBoardForm parentId={parentId} onCancel={handleCancel} />;
    }

    return (
        <button
            onClick={handleButtonClick}
            className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 focus:ring-1 focus:ring-green-500 focus:ring-offset-1 transition-colors flex items-center"
            title="Add a child board"
        >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Child Board
        </button>
    );
}
