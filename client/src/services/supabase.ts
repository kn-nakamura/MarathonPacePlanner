import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    
    return { data, error };
  },
  
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  },
  
  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  
  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },
  
  // Get session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },
};

// Database functions
export const db = {
  // Pace Plans
  pacePlans: {
    // Get all pace plans for a user
    getAllForUser: async (userId: string) => {
      const { data, error } = await supabase
        .from('pace_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    
    // Get a single pace plan by ID
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('pace_plans')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    // Create a new pace plan
    create: async (plan: any) => {
      const { data, error } = await supabase
        .from('pace_plans')
        .insert(plan)
        .select();
      
      return { data, error };
    },
    
    // Update a pace plan
    update: async (id: string, plan: any) => {
      const { data, error } = await supabase
        .from('pace_plans')
        .update(plan)
        .eq('id', id)
        .select();
      
      return { data, error };
    },
    
    // Delete a pace plan
    delete: async (id: string) => {
      const { error } = await supabase
        .from('pace_plans')
        .delete()
        .eq('id', id);
      
      return { error };
    },
  },
};
