import express, { Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { testConnection, initializeDatabase, closePool } from "./database";
import { UserModel, CreateUserData } from "./models/User";
import { BoardModel, CreateBoardData, UpdateBoardData } from "./models/Board";

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

// Users endpoints
app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    const users = await UserModel.findAll();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const userData: CreateUserData = req.body;
    const user = await UserModel.create(userData);
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

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

interface NotificationMessage {
  message: string;
}

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Broadcast notification every second
setInterval(() => {
  const notification: NotificationMessage = {
    message: "Server notification: " + new Date().toLocaleString(),
  };
  io.emit("notification", notification);
}, 1000);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // Start the server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connected and tables initialized`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Gracefully shutting down...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Gracefully shutting down...');
  await closePool();
  process.exit(0);
});

startServer();
