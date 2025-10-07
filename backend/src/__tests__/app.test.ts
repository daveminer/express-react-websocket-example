import express, { Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import supertest from "supertest";
import { BoardModel, CreateBoardData, UpdateBoardData } from "../models/Board";
import { setupTestDatabase, teardownTestDatabase, createTestUser, closeDatabase } from "./testSetup";

// Create app without starting the server or socket
function createTestApp() {
    const app = express();
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
        cors: {
            origin: ["http://localhost:3000", "http://frontend:3000"],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    app.use(express.json());
    app.use(
        cors({
            origin: ["http://localhost:3000", "http://frontend:3000"],
            credentials: true,
        })
    );

    // Boards endpoints
    app.get("/api/boards", async (_req: Request, res: Response) => {
        try {
            const boards = await BoardModel.findAll();
            res.json(boards);
        } catch (error) {
            console.error("Error fetching boards:", error);
            res.status(500).json({ error: "Failed to fetch boards" });
        }
    });

    app.get("/api/boards/root", async (_req: Request, res: Response) => {
        try {
            const boards = await BoardModel.findRootBoards();
            res.json(boards);
        } catch (error) {
            console.error("Error fetching root boards:", error);
            res.status(500).json({ error: "Failed to fetch root boards" });
        }
    });

    app.get("/api/boards/:id", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const board = await BoardModel.findById(id);
            if (!board) {
                return res.status(404).json({ error: "Board not found" });
            }
            res.json(board);
        } catch (error) {
            console.error("Error fetching board:", error);
            res.status(500).json({ error: "Failed to fetch board" });
        }
    });

    app.get("/api/boards/:id/children", async (req: Request, res: Response) => {
        try {
            const parentId = parseInt(req.params.id);
            if (isNaN(parentId)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const boards = await BoardModel.findByParentId(parentId);
            res.json(boards);
        } catch (error) {
            console.error("Error fetching child boards:", error);
            res.status(500).json({ error: "Failed to fetch child boards" });
        }
    });

    app.get("/api/boards/:id/hierarchy", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const hierarchy = await BoardModel.getHierarchy(id);
            res.json(hierarchy);
        } catch (error) {
            console.error("Error fetching board hierarchy:", error);
            res.status(500).json({ error: "Failed to fetch board hierarchy" });
        }
    });

    app.get("/api/boards/:id/stats", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const stats = await BoardModel.getStats(id);
            res.json(stats);
        } catch (error) {
            console.error("Error fetching board stats:", error);
            res.status(500).json({ error: "Failed to fetch board stats" });
        }
    });

    app.get("/api/boards/:id/depth", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const depth = await BoardModel.getDepth(id);
            res.json({ depth });
        } catch (error) {
            console.error("Error fetching board depth:", error);
            res.status(500).json({ error: "Failed to fetch board depth" });
        }
    });

    app.post("/api/boards", async (req: Request, res: Response) => {
        try {
            const boardData: CreateBoardData = req.body;

            // Check depth if parent_id is provided
            if (boardData.parent_id) {
                const parentDepth = await BoardModel.getDepth(boardData.parent_id);

                if (parentDepth >= 10) {
                    return res.status(400).json({
                        error: "Maximum hierarchy depth exceeded. Cannot create boards beyond 10 levels deep."
                    });
                }
            }

            const board = await BoardModel.create(boardData);
            res.status(201).json(board);
        } catch (error) {
            console.error("Error creating board:", error);
            res.status(500).json({ error: "Failed to create board" });
        }
    });

    app.put("/api/boards/:id", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const boardData: UpdateBoardData = req.body;

            // Check depth if parent_id is being updated
            if (boardData.parent_id !== undefined) {
                if (boardData.parent_id !== null) {
                    const parentDepth = await BoardModel.getDepth(boardData.parent_id);

                    if (parentDepth >= 10) {
                        return res.status(400).json({
                            error: "Maximum hierarchy depth exceeded. Cannot create boards beyond 10 levels deep."
                        });
                    }
                }
            }

            const board = await BoardModel.update(id, boardData);
            if (!board) {
                return res.status(404).json({ error: "Board not found" });
            }
            res.json(board);
        } catch (error) {
            console.error("Error updating board:", error);
            res.status(500).json({ error: "Failed to update board" });
        }
    });

    app.delete("/api/boards/:id", async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(404).json({ error: "Board not found" });
            }
            const deleted = await BoardModel.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: "Board not found" });
            }
            res.status(204).send();
        } catch (error) {
            console.error("Error deleting board:", error);
            res.status(500).json({ error: "Failed to delete board" });
        }
    });

    return { app, server, io };
}

describe("Board API Integration Tests", () => {
    let request: ReturnType<typeof supertest>;
    let testUserId: number;

    beforeAll(async () => {
        // Set up test database
        await setupTestDatabase();

        // Create test user
        testUserId = await createTestUser();

        // Create app for testing
        const { app } = createTestApp();
        request = supertest(app);
    });

    afterAll(async () => {
        await closeDatabase();
    });

    beforeEach(async () => {
        // Clean boards before each test
        await teardownTestDatabase();
        testUserId = await createTestUser();
    });

    describe("GET /api/boards", () => {
        it("should return empty array when no boards exist", async () => {
            const response = await request.get("/api/boards");

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it("should return all boards", async () => {
            // Create test boards
            await BoardModel.create({ title: "Board 1", created_by: testUserId });
            await BoardModel.create({ title: "Board 2", created_by: testUserId });

            const response = await request.get("/api/boards");

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe("Board 2"); // Most recent first
            expect(response.body[1].title).toBe("Board 1");
        });
    });

    describe("GET /api/boards/root", () => {
        it("should return only root boards (no parent)", async () => {
            // Create root and child boards
            const rootBoard = await BoardModel.create({ title: "Root Board", created_by: testUserId });
            await BoardModel.create({ title: "Child Board", parent_id: rootBoard.id, created_by: testUserId });

            const response = await request.get("/api/boards/root");

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].title).toBe("Root Board");
            expect(response.body[0].parent_id).toBeNull();
        });

        it("should return empty array when no root boards exist", async () => {
            const response = await request.get("/api/boards/root");

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe("GET /api/boards/:id", () => {
        it("should return a board by id", async () => {
            const board = await BoardModel.create({
                title: "Test Board",
                description: "Test Description",
                created_by: testUserId
            });

            const response = await request.get(`/api/boards/${board.id}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(board.id);
            expect(response.body.title).toBe("Test Board");
            expect(response.body.description).toBe("Test Description");
        });

        it("should return 404 when board not found", async () => {
            const response = await request.get("/api/boards/99999");

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Board not found");
        });
    });

    describe("GET /api/boards/:id/children", () => {
        it("should return all children of a board", async () => {
            const parentBoard = await BoardModel.create({ title: "Parent", created_by: testUserId });
            await BoardModel.create({ title: "Child 1", parent_id: parentBoard.id, created_by: testUserId });
            await BoardModel.create({ title: "Child 2", parent_id: parentBoard.id, created_by: testUserId });

            const response = await request.get(`/api/boards/${parentBoard.id}/children`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].parent_id).toBe(parentBoard.id);
            expect(response.body[1].parent_id).toBe(parentBoard.id);
        });

        it("should return empty array when board has no children", async () => {
            const board = await BoardModel.create({ title: "Childless", created_by: testUserId });

            const response = await request.get(`/api/boards/${board.id}/children`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe("GET /api/boards/:id/hierarchy", () => {
        it("should return board and all its descendants", async () => {
            const grandparent = await BoardModel.create({ title: "Grandparent", created_by: testUserId });
            const parent = await BoardModel.create({ title: "Parent", parent_id: grandparent.id, created_by: testUserId });
            await BoardModel.create({ title: "Child", parent_id: parent.id, created_by: testUserId });

            const response = await request.get(`/api/boards/${grandparent.id}/hierarchy`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(3);
            expect(response.body[0].title).toBe("Grandparent");
            expect(response.body[0].level).toBe(0);
            expect(response.body[1].title).toBe("Parent");
            expect(response.body[1].level).toBe(1);
            expect(response.body[2].title).toBe("Child");
            expect(response.body[2].level).toBe(2);
        });

        it("should return only the board when it has no children", async () => {
            const board = await BoardModel.create({ title: "Lonely", created_by: testUserId });

            const response = await request.get(`/api/boards/${board.id}/hierarchy`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].title).toBe("Lonely");
        });
    });

    describe("GET /api/boards/:id/stats", () => {
        it("should return correct statistics for a board", async () => {
            const grandparent = await BoardModel.create({ title: "Grandparent", created_by: testUserId });
            const parent1 = await BoardModel.create({ title: "Parent 1", parent_id: grandparent.id, created_by: testUserId });
            const parent2 = await BoardModel.create({ title: "Parent 2", parent_id: grandparent.id, created_by: testUserId });
            await BoardModel.create({ title: "Child 1", parent_id: parent1.id, created_by: testUserId });
            await BoardModel.create({ title: "Child 2", parent_id: parent1.id, created_by: testUserId });

            const response = await request.get(`/api/boards/${grandparent.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.direct_children).toBe("2"); // parent1 and parent2
            expect(response.body.total_children).toBe("4"); // parent1, parent2, child1, child2
        });

        it("should return zero stats for board with no children", async () => {
            const board = await BoardModel.create({ title: "Lonely", created_by: testUserId });

            const response = await request.get(`/api/boards/${board.id}/stats`);

            expect(response.status).toBe(200);
            expect(response.body.direct_children).toBe("0");
            expect(response.body.total_children).toBe("0");
        });
    });

    describe("GET /api/boards/:id/depth", () => {
        it("should return correct depth for root board", async () => {
            const board = await BoardModel.create({ title: "Root", created_by: testUserId });

            const response = await request.get(`/api/boards/${board.id}/depth`);

            expect(response.status).toBe(200);
            expect(response.body.depth).toBe(0);
        });

        it("should return correct depth for nested board", async () => {
            const level1 = await BoardModel.create({ title: "Level 1", created_by: testUserId });
            const level2 = await BoardModel.create({ title: "Level 2", parent_id: level1.id, created_by: testUserId });
            const level3 = await BoardModel.create({ title: "Level 3", parent_id: level2.id, created_by: testUserId });

            const response = await request.get(`/api/boards/${level3.id}/depth`);

            expect(response.status).toBe(200);
            expect(response.body.depth).toBe(2);
        });
    });

    describe("POST /api/boards", () => {
        it("should create a new root board", async () => {
            const boardData = {
                title: "New Board",
                description: "New Description",
                created_by: testUserId
            };

            const response = await request
                .post("/api/boards")
                .send(boardData);

            expect(response.status).toBe(201);
            expect(response.body.title).toBe("New Board");
            expect(response.body.description).toBe("New Description");
            expect(response.body.parent_id).toBeNull();
            expect(response.body.id).toBeDefined();
        });

        it("should create a child board", async () => {
            const parent = await BoardModel.create({ title: "Parent", created_by: testUserId });

            const boardData = {
                title: "Child Board",
                parent_id: parent.id,
                created_by: testUserId
            };

            const response = await request
                .post("/api/boards")
                .send(boardData);

            expect(response.status).toBe(201);
            expect(response.body.title).toBe("Child Board");
            expect(response.body.parent_id).toBe(parent.id);
        });

        it("should reject creation beyond depth limit (10 levels)", async () => {
            // Create a chain of 10 boards (0-9 depth)
            let currentBoard = await BoardModel.create({ title: "Level 0", created_by: testUserId });

            for (let i = 1; i <= 10; i++) {
                currentBoard = await BoardModel.create({
                    title: `Level ${i}`,
                    parent_id: currentBoard.id,
                    created_by: testUserId
                });
            }

            // Try to create an 11th level
            const boardData = {
                title: "Too Deep",
                parent_id: currentBoard.id,
                created_by: testUserId
            };

            const response = await request
                .post("/api/boards")
                .send(boardData);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("Maximum hierarchy depth exceeded");
        });

        it("should create board without description", async () => {
            const boardData = {
                title: "Minimal Board",
                created_by: testUserId
            };

            const response = await request
                .post("/api/boards")
                .send(boardData);

            expect(response.status).toBe(201);
            expect(response.body.title).toBe("Minimal Board");
            expect(response.body.description).toBeNull();
        });
    });

    describe("PUT /api/boards/:id", () => {
        it("should update board title", async () => {
            const board = await BoardModel.create({ title: "Old Title", created_by: testUserId });

            const response = await request
                .put(`/api/boards/${board.id}`)
                .send({ title: "New Title" });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe("New Title");
            expect(response.body.id).toBe(board.id);
        });

        it("should update board description", async () => {
            const board = await BoardModel.create({
                title: "Board",
                description: "Old Description",
                created_by: testUserId
            });

            const response = await request
                .put(`/api/boards/${board.id}`)
                .send({ description: "New Description" });

            expect(response.status).toBe(200);
            expect(response.body.description).toBe("New Description");
            expect(response.body.title).toBe("Board"); // Title unchanged
        });

        it("should update board parent", async () => {
            const board = await BoardModel.create({ title: "Board", created_by: testUserId });
            const newParent = await BoardModel.create({ title: "New Parent", created_by: testUserId });

            const response = await request
                .put(`/api/boards/${board.id}`)
                .send({ parent_id: newParent.id });

            expect(response.status).toBe(200);
            expect(response.body.parent_id).toBe(newParent.id);
        });

        it("should reject update that exceeds depth limit", async () => {
            // Create a chain of 10 boards
            let deepBoard = await BoardModel.create({ title: "Level 0", created_by: testUserId });

            for (let i = 1; i <= 10; i++) {
                deepBoard = await BoardModel.create({
                    title: `Level ${i}`,
                    parent_id: deepBoard.id,
                    created_by: testUserId
                });
            }

            // Try to move a root board under the deep board
            const rootBoard = await BoardModel.create({ title: "Root", created_by: testUserId });

            const response = await request
                .put(`/api/boards/${rootBoard.id}`)
                .send({ parent_id: deepBoard.id });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("Maximum hierarchy depth exceeded");
        });

        it("should return 404 when updating non-existent board", async () => {
            const response = await request
                .put("/api/boards/99999")
                .send({ title: "New Title" });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Board not found");
        });

        it("should update multiple fields at once", async () => {
            const board = await BoardModel.create({
                title: "Old Title",
                description: "Old Description",
                created_by: testUserId
            });

            const response = await request
                .put(`/api/boards/${board.id}`)
                .send({
                    title: "New Title",
                    description: "New Description"
                });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe("New Title");
            expect(response.body.description).toBe("New Description");
        });
    });

    describe("DELETE /api/boards/:id", () => {
        it("should delete a board", async () => {
            const board = await BoardModel.create({ title: "To Delete", created_by: testUserId });

            const response = await request.delete(`/api/boards/${board.id}`);

            expect(response.status).toBe(204);

            // Verify it's deleted
            const getResponse = await request.get(`/api/boards/${board.id}`);
            expect(getResponse.status).toBe(404);
        });

        it("should cascade delete child boards", async () => {
            const parent = await BoardModel.create({ title: "Parent", created_by: testUserId });
            const child = await BoardModel.create({ title: "Child", parent_id: parent.id, created_by: testUserId });

            // Delete parent
            const response = await request.delete(`/api/boards/${parent.id}`);
            expect(response.status).toBe(204);

            // Verify child is also deleted
            const getResponse = await request.get(`/api/boards/${child.id}`);
            expect(getResponse.status).toBe(404);
        });

        it("should return 404 when deleting non-existent board", async () => {
            const response = await request.delete("/api/boards/99999");

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Board not found");
        });
    });

    describe("Edge Cases", () => {
        it("should handle invalid board id format", async () => {
            const response = await request.get("/api/boards/invalid");

            expect(response.status).toBe(404);
        });

        it("should handle missing required fields when creating board", async () => {
            const response = await request
                .post("/api/boards")
                .send({});

            expect(response.status).toBe(500);
        });

        it("should handle empty request body for update", async () => {
            const board = await BoardModel.create({ title: "Board", created_by: testUserId });

            const response = await request
                .put(`/api/boards/${board.id}`)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.title).toBe("Board"); // Unchanged
        });
    });
});

