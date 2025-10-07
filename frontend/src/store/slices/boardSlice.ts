import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Board {
    id: number;
    parent_id: number | null;
    title: string;
    description: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    created_by_username?: string;
}

interface BoardState {
    rootBoards: Board[];
    childBoards: { [parentId: number]: Board[] };
    loading: boolean;
    error: string | null;
}

const initialState: BoardState = {
    rootBoards: [],
    childBoards: {},
    loading: false,
    error: null,
};

const boardSlice = createSlice({
    name: 'boards',
    initialState,
    reducers: {
        setRootBoards: (state, action: PayloadAction<Board[]>) => {
            state.rootBoards = action.payload;
            state.loading = false;
            state.error = null;
        },
        setChildBoards: (state, action: PayloadAction<{ parentId: number; children: Board[] }>) => {
            state.childBoards[action.payload.parentId] = action.payload.children;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading = false;
        },
        clearBoards: (state) => {
            state.rootBoards = [];
            state.childBoards = {};
            state.error = null;
        },
    },
});

export const {
    setRootBoards,
    setChildBoards,
    setLoading,
    setError,
    clearBoards
} = boardSlice.actions;

export default boardSlice.reducer;
