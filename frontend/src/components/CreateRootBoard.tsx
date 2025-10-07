'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../store/hooks';
import { setRootBoards } from '../store/slices/boardSlice';

interface CreateBoardData {
    title: string;
    description?: string;
    parent_id?: number | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function CreateRootBoard() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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
            // Update React Query cache
            queryClient.setQueryData(['boards', 'root'], (oldData: any) => {
                if (!oldData) return [newBoard];
                // Check if board already exists to avoid duplicates
                const exists = oldData.some((board: any) => board.id === newBoard.id);
                return exists ? oldData : [...oldData, newBoard];
            });

            // Update Redux store
            queryClient.invalidateQueries({ queryKey: ['boards', 'root'] });

            // Reset form and show success
            setTitle('');
            setDescription('');
            setError(null);
            setSuccess(true);
            setIsSubmitting(false);

            // Hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
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
            parent_id: null, // Root board has no parent
        });
    };

    const handleReset = () => {
        setTitle('');
        setDescription('');
        setError(null);
        setSuccess(false);
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
            <div className="mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Create New Root Board</h2>
                <p className="text-gray-600 text-xs mt-1">
                    Create a new top-level board to organize your content
                </p>
            </div>

            {success && (
                <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center">
                        <div className="text-green-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="ml-2 text-green-800 font-medium">
                            Board created successfully!
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center">
                        <div className="text-red-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="ml-2 text-red-800 font-medium">{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-1">
                        Board Title *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter board title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                        disabled={isSubmitting}
                        maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {title.length}/100 characters
                    </p>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter board description..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-900"
                        disabled={isSubmitting}
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {description.length}/500 characters
                    </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        Clear Form
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
