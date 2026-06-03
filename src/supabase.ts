import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tsefcgjifoppyssavppv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZWZjZ2ppZm9wcHlzc2F2cHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDE1MTcsImV4cCI6MjA5NjA3NzUxN30.jZQ_JMmYpV9pZGtynE8mUcNA3BCNLXAcfTKc39a5OzE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
