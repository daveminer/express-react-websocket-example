'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../store/hooks';
import { setChildBoards } from '../store/slices/boardSlice';

interface CreateBoardData {
    title: string;
    description?: string;
    parent_id: number;
}

interface CreateChildBoardFormProps {
    parentId: number;
    onCancel: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function CreateChildBoardForm({ parentId, onCancel }: CreateChildBoardFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const createBoardMutation = useMutation({
        mutationFn: async (boardData: CreateBoardData) => {
            const response = await fetch(`${API_BASE_URL}/api/boards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(boardData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create board');
            }

            return response.json();
        },
        onSuccess: (newBoard) => {
            // Update child boards cache for this parent
            queryClient.setQueryData(['boards', 'children', parentId], (oldData: any) => {
                if (!oldData) return [newBoard];
                const exists = oldData.some((board: any) => board.id === newBoard.id);
                return exists ? oldData : [...oldData, newBoard];
            });

            // Update Redux store
            const currentChildren = queryClient.getQueryData(['boards', 'children', parentId]) as any[] || [];
            dispatch(setChildBoards({ parentId, children: [...currentChildren, newBoard] }));

            // Reset form and close
            setTitle('');
            setDescription('');
            setError(null);
            setIsSubmitting(false);
            onCancel();
        },
        onError: (error: Error) => {
            setError(error.message);
            setIsSubmitting(false);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (title.trim().length < 3) {
            setError('Title must be at least 3 characters long');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        createBoardMutation.mutate({
            title: title.trim(),
            description: description.trim() || undefined,
            parent_id: parentId,
        });
    };

    const handleCancel = () => {
        setTitle('');
        setDescription('');
        setError(null);
        setIsSubmitting(false);
        onCancel();
    };

    return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Create Child Board</h4>

            {error && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center">
                        <div className="text-red-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="ml-2 text-red-800 text-sm">{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <div>
                    <label htmlFor={`title-${parentId}`} className="block text-xs font-medium text-gray-600 mb-1">
                        Board Title *
                    </label>
                    <input
                        type="text"
                        id={`title-${parentId}`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter board title..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                        disabled={isSubmitting}
                        maxLength={100}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        {title.length}/100 characters
                    </p>
                </div>

                <div>
                    <label htmlFor={`description-${parentId}`} className="block text-xs font-medium text-gray-600 mb-1">
                        Description (Optional)
                    </label>
                    <textarea
                        id={`description-${parentId}`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter board description..."
                        rows={2}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-900"
                        disabled={isSubmitting}
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        {description.length}/500 characters
                    </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim()}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Creating...
                            </>
                        ) : (
                            'Create Board'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
