'use client';

import React, { useEffect, useState } from 'react';
import { useRootBoards, useChildBoards, Board } from '../hooks/useBoards';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRootBoards, setChildBoards, setLoading, setError } from '../store/slices/boardSlice';
import CreateChildBoardButton from './CreateChildBoardButton';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface BoardItemProps {
    board: Board;
    level?: number;
}

const BoardItem: React.FC<BoardItemProps> = ({ board, level = 0 }) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { data: childBoards, isLoading: childrenLoading, error: childrenError } = useChildBoards(board.id);
    const childBoardsFromStore = useAppSelector(state => state.boards.childBoards[board.id] || []);

    useEffect(() => {
        if (childBoards) {
            dispatch(setChildBoards({ parentId: board.id, children: childBoards }));
        }
    }, [childBoards, dispatch, board.id]);

    const deleteBoardMutation = useMutation({
        mutationFn: async (boardId: number) => {
            const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${API_BASE_URL}/api/boards/${boardId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete board');
            }

            return boardId;
        },
        onSuccess: (deletedBoardId) => {
            // Remove from root boards if it's a root board
            queryClient.setQueryData(['boards', 'root'], (oldData: any) => {
                return oldData ? oldData.filter((board: Board) => board.id !== deletedBoardId) : [];
            });

            // Remove from child boards cache for all parents
            queryClient.invalidateQueries({ queryKey: ['boards', 'children'] });

            // Update Redux store
            const currentRootBoards = queryClient.getQueryData(['boards', 'root']) || [];
            dispatch(setRootBoards(currentRootBoards as Board[]));

            // Clear any child boards data for this board
            dispatch(setChildBoards({ parentId: deletedBoardId, children: [] }));

            setShowDeleteConfirm(false);
        },
        onError: (error: Error) => {
            console.error('Failed to delete board:', error);
            setShowDeleteConfirm(false);
        },
    });

    const handleDelete = () => {
        deleteBoardMutation.mutate(board.id);
    };

    return (
        <div className={`ml-${level * 4} border-l-2 border-gray-200 pl-4 mb-4`}>
            <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{board.title}</h3>
                        {board.description && (
                            <p className="text-gray-600 mt-2">{board.description}</p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete board"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-gray-500">
                        {board.created_by_username && (
                            <span>Created by {board.created_by_username}</span>
                        )}
                        <span className="ml-2">
                            {new Date(board.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="text-sm text-blue-600">
                        {childBoardsFromStore.length} child boards
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="text-red-600 mr-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-red-800">Delete "{board.title}"?</p>
                                <p className="text-xs text-red-600">
                                    This will also delete all child boards. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                disabled={deleteBoardMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                disabled={deleteBoardMutation.isPending}
                            >
                                {deleteBoardMutation.isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Render child boards */}
            {childrenLoading && (
                <div className="ml-4 mt-2 text-sm text-gray-500">Loading children...</div>
            )}

            {childrenError && (
                <div className="ml-4 mt-2 text-sm text-red-500">
                    Error loading child boards
                </div>
            )}

            {childBoardsFromStore.map((childBoard, index) => (
                <BoardItem
                    key={`child-${childBoard.id}-${level}-${index}`}
                    board={childBoard}
                    level={level + 1}
                />
            ))}

            <CreateChildBoardButton parentId={board.id} level={level} />
        </div>
    );
};

export default function BoardList() {
    const dispatch = useAppDispatch();
    const { rootBoards, loading, error } = useAppSelector(state => state.boards);

    const {
        data: fetchedRootBoards,
        isLoading: rootLoading,
        error: rootError
    } = useRootBoards();

    // Update Redux store when data is fetched
    useEffect(() => {
        if (fetchedRootBoards) {
            dispatch(setRootBoards(fetchedRootBoards));
        }
    }, [fetchedRootBoards, dispatch]);

    useEffect(() => {
        if (rootError) {
            dispatch(setError(rootError.message));
        }
    }, [rootError, dispatch]);

    useEffect(() => {
        dispatch(setLoading(rootLoading));
    }, [rootLoading, dispatch]);

    if (loading || rootLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading boards...</span>
            </div>
        );
    }

    if (error || rootError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold">Error Loading Boards</h3>
                <p className="text-red-600 mt-1">{error || rootError?.message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!rootBoards || rootBoards.length === 0) {
        return (
            <div className="text-center p-8">
                <div className="text-gray-500 text-lg">No boards found</div>
                <p className="text-gray-400 mt-2">Create your first board to get started!</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Board Hierarchy</h1>
            </div>

            <div className="space-y-4">
                {rootBoards.map((board, index) => (
                    <BoardItem key={`root-${board.id}-${index}`} board={board} />
                ))}
            </div>
        </div>
    );
}