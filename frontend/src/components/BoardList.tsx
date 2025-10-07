'use client';

import React, { useEffect } from 'react';
import { useRootBoards, useChildBoards, Board } from '../hooks/useBoards';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRootBoards, setChildBoards, setLoading, setError } from '../store/slices/boardSlice';
import CreateChildBoardButton from './CreateChildBoardButton';

interface BoardItemProps {
    board: Board;
    level?: number;
}

const BoardItem: React.FC<BoardItemProps> = ({ board, level = 0 }) => {
    const dispatch = useAppDispatch();
    const { data: childBoards, isLoading: childrenLoading, error: childrenError } = useChildBoards(board.id);
    const childBoardsFromStore = useAppSelector(state => state.boards.childBoards[board.id] || []);

    useEffect(() => {
        if (childBoards) {
            dispatch(setChildBoards({ parentId: board.id, children: childBoards }));
        }
    }, [childBoards, dispatch, board.id]);

    return (
        <div className={`ml-${level * 4} border-l-2 border-gray-200 pl-4 mb-4`}>
            <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-800">{board.title}</h3>
                {board.description && (
                    <p className="text-gray-600 mt-2">{board.description}</p>
                )}
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