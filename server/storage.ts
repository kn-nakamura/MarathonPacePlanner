import { users, type User, type InsertUser, pacePlans, type PacePlan, type InsertPacePlan } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Pace Plan methods
  getPacePlan(id: number): Promise<PacePlan | undefined>;
  getPacePlansByUserId(userId: number): Promise<PacePlan[]>;
  createPacePlan(plan: InsertPacePlan): Promise<PacePlan>;
  updatePacePlan(id: number, plan: Partial<InsertPacePlan>): Promise<PacePlan | undefined>;
  deletePacePlan(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pacePlans: Map<number, PacePlan>;
  private userIdCounter: number;
  private planIdCounter: number;

  constructor() {
    this.users = new Map();
    this.pacePlans = new Map();
    this.userIdCounter = 1;
    this.planIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Pace Plan methods
  async getPacePlan(id: number): Promise<PacePlan | undefined> {
    return this.pacePlans.get(id);
  }

  async getPacePlansByUserId(userId: number): Promise<PacePlan[]> {
    return Array.from(this.pacePlans.values()).filter(
      (plan) => plan.userId === userId
    );
  }

  async createPacePlan(insertPlan: InsertPacePlan): Promise<PacePlan> {
    const id = this.planIdCounter++;
    const now = new Date();
    const plan: PacePlan = { 
      ...insertPlan, 
      id, 
      createdAt: now 
    };
    this.pacePlans.set(id, plan);
    return plan;
  }

  async updatePacePlan(id: number, updateData: Partial<InsertPacePlan>): Promise<PacePlan | undefined> {
    const existingPlan = this.pacePlans.get(id);
    if (!existingPlan) {
      return undefined;
    }
    
    const updatedPlan: PacePlan = {
      ...existingPlan,
      ...updateData,
    };
    this.pacePlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deletePacePlan(id: number): Promise<boolean> {
    return this.pacePlans.delete(id);
  }
}

export const storage = new MemStorage();
