-- TeachFlow Database Schema

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT,
  grade INTEGER,
  duration INTEGER DEFAULT 45,
  description TEXT,
  content TEXT, -- JSON string of lesson blocks
  rating REAL DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT,
  grade INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  class_id INTEGER,
  avg_grade REAL DEFAULT 0,
  status TEXT DEFAULT 'good',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'homework', -- homework, test, quiz
  class_id INTEGER,
  due_date TEXT,
  submitted INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, graded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active INTEGER DEFAULT 1
);

-- Notifications table

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT,
  type TEXT DEFAULT 'info',
  text TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo data
INSERT INTO classes (name, subject) VALUES 
  ('5А', 'Математика'),
  ('7Б', 'Физика'),
  ('6А', 'Английский'),
  ('9В', 'Алгебра');

INSERT INTO students (name, email, class_id, avg_grade, status) VALUES 
  ('Иванов Иван', 'ivanov@school.ru', 1, 4.8, 'excellent'),
  ('Петрова Мария', 'petrova@school.ru', 1, 4.6, 'good'),
  ('Сидоров Алексей', 'sidorov@school.ru', 1, 4.4, 'good'),
  ('Козлова Анна', 'kozlova@school.ru', 1, 4.2, 'good'),
  ('Новиков Дмитрий', 'novikov@school.ru', 1, 3.8, 'average'),
  ('Морозова Елена', 'morozova@school.ru', 1, 3.5, 'attention'),
  ('Волков Павел', 'volkov@school.ru', 1, 4.9, 'excellent'),
  ('Соколова Дарья', 'sokolova@school.ru', 1, 4.5, 'good');

INSERT INTO lessons (title, subject, grade, duration, description, rating, ratings_count, likes, is_published) VALUES 
  ('Введение в дроби', 'Математика', 5, 45, 'Изучение понятия дроби и их видов', 4.9, 234, 567, 1),
  ('Законы Ньютона', 'Физика', 7, 45, 'Три закона динамики Ньютона', 4.8, 189, 432, 1),
  ('Present Simple Tense', 'Английский язык', 6, 40, 'Простое настоящее время в английском', 4.7, 156, 389, 1),
  ('Глаголы движения в русском языке', 'Русский язык', 3, 40, 'Изучение глаголов движения', 4.6, 145, 320, 1),
  ('Основы программирования: Scratch', 'Информатика', 5, 45, 'Первые шаги в программировании', 4.9, 289, 567, 1),
  ('Великая Отечественная война', 'История', 9, 45, 'Основные события ВОВ', 4.8, 198, 412, 1);

INSERT INTO assignments (title, type, class_id, due_date, submitted, total, status) VALUES 
  ('Контрольная работа: Дроби', 'test', 1, '2026-02-06', 24, 28, 'active'),
  ('Домашнее задание: Законы Ньютона', 'homework', 2, '2026-02-05', 18, 26, 'active'),
  ('Тест: Present Simple', 'quiz', 3, '2026-02-04', 25, 25, 'completed'),
  ('Эссе: Герой нашего времени', 'homework', 4, '2026-02-07', 12, 24, 'active'),
  ('Лабораторная работа: Фотосинтез', 'homework', 3, '2026-02-03', 25, 25, 'graded');

INSERT INTO notifications (icon, type, text) VALUES 
  ('✅', 'success', 'Класс 5А: 23 из 28 учеников сдали задание'),
  ('💬', 'info', 'Новый комментарий к вашему уроку "Дроби"'),
  ('⚠️', 'warning', 'Завтра дедлайн по заданию для 7Б');
