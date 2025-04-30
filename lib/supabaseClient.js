// Подключение библиотеки Supabase
import { createClient } from '@supabase/supabase-js';

// Твои ключи доступа к проекту
const supabaseUrl = 'https://xyxuntjgbyykuyppkgvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eHVudGpnYnl5a3V5cHBrZ3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk2MDEsImV4cCI6MjA2MTUyNTYwMX0.VijROTf3-fE6vCOsg-7cqQsFS3qe0178v97YSVkXnp8';

// Создание клиента Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
