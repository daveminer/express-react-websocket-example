import { useQuery } from '@tanstack/react-query';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Fetch root boards
export const useRootBoards = () => {
    return useQuery<Board[]>({
        queryKey: ['boards', 'root'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/api/boards/root`);
            if (!response.ok) {
                throw new Error('Failed to fetch root boards');
            }
            return response.json();
        },
    });
};

// Fetch child boards for a specific parent
export const useChildBoards = (parentId: number) => {
    return useQuery<Board[]>({
        queryKey: ['boards', 'children', parentId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/api/boards/${parentId}/children`);
            if (!response.ok) {
                throw new Error(`Failed to fetch child boards for parent ${parentId}`);
            }
            return response.json();
        },
        enabled: !!parentId, // Only run query if parentId exists
    });
};
