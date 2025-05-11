import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPacePlanSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Login validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app.route("/api");

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create session for user (simplified - in a real app, use proper session management)
      if (req.session) {
        req.session.userId = user.id;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        message: "Login successful",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.status(200).json({ message: "Logout successful" });
      });
    } else {
      res.status(200).json({ message: "No active session" });
    }
  });

  // Pace Plan routes
  app.get("/api/pace-plans", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const plans = await storage.getPacePlansByUserId(req.session.userId);
      return res.status(200).json(plans);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/pace-plans/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const plan = await storage.getPacePlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Check if the plan belongs to the user
      if (plan.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      return res.status(200).json(plan);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/pace-plans", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate plan data
      const validatedData = insertPacePlanSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      // Create the plan
      const plan = await storage.createPacePlan(validatedData);
      return res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/pace-plans/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      // Check if plan exists and belongs to the user
      const existingPlan = await storage.getPacePlan(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (existingPlan.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Update the plan
      const updatedPlan = await storage.updatePacePlan(planId, req.body);
      return res.status(200).json(updatedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/pace-plans/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      // Check if plan exists and belongs to the user
      const existingPlan = await storage.getPacePlan(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (existingPlan.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Delete the plan
      await storage.deletePacePlan(planId);
      return res.status(200).json({ message: "Plan deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
