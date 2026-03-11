# TeachFlow Database ERD

## Entity Relationship Diagram (Text)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     USERS       │     │    CLASSES      │     │    STUDENTS     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │──1──│ id (PK)         │──*──│ id (PK)         │
│ email           │  *  │ name            │     │ name            │
│ password_hash   │     │ grade           │     │ email           │
│ name            │     │ subject         │     │ class_id (FK)   │
│ role            │     │ teacher_id (FK) │     │ parent_email    │
│ avatar_url      │     │ google_class_id │     │ created_at      │
│ plan            │     │ created_at      │     └─────────────────┘
│ created_at      │     │ updated_at      │
│ updated_at      │     └─────────────────┘
└─────────────────┘
         │
         │ 1
         ▼ *
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    LESSONS      │     │  LESSON_BLOCKS  │     │   BLOCK_TYPES   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │──1──│ id (PK)         │──*──│ id (PK)         │
│ title           │  *  │ lesson_id (FK)  │  1  │ name            │
│ description     │     │ type_id (FK)    │     │ icon            │
│ subject         │     │ content (JSON)  │     │ schema (JSON)   │
│ grade           │     │ position        │     └─────────────────┘
│ duration        │     │ created_at      │
│ author_id (FK)  │     └─────────────────┘
│ is_published    │
│ is_template     │
│ views           │
│ rating          │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1
         ▼ *
┌─────────────────┐
│ LESSON_RATINGS  │
├─────────────────┤
│ id (PK)         │
│ lesson_id (FK)  │
│ user_id (FK)    │
│ rating (1-5)    │
│ comment         │
│ created_at      │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  ASSIGNMENTS    │     │  SUBMISSIONS    │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │──1──│ id (PK)         │
│ title           │  *  │ assignment_id   │
│ description     │     │ student_id (FK) │
│ class_id (FK)   │     │ content (JSON)  │
│ lesson_id (FK)  │     │ score           │
│ due_date        │     │ graded_at       │
│ type            │     │ submitted_at    │
│ max_score       │     │ status          │
│ auto_grade      │     │ feedback        │
│ created_at      │     └─────────────────┘
│ updated_at      │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ NOTIFICATIONS   │     │  INTEGRATIONS   │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ user_id (FK)    │     │ user_id (FK)    │
│ type            │     │ provider        │
│ title           │     │ access_token    │
│ message         │     │ refresh_token   │
│ link            │     │ expires_at      │
│ is_read         │     │ metadata (JSON) │
│ created_at      │     │ created_at      │
└─────────────────┘     └─────────────────┘

┌─────────────────┐
│ SUBSCRIPTIONS   │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ plan            │
│ stripe_sub_id   │
│ stripe_cust_id  │
│ status          │
│ current_period_start │
│ current_period_end   │
│ created_at      │
└─────────────────┘
```

---

## Table Definitions

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| role | ENUM('teacher','admin','parent') | DEFAULT 'teacher' |
| avatar_url | VARCHAR(512) | |
| plan | ENUM('free','pro','proplus','school') | DEFAULT 'free' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### classes
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| grade | INTEGER | |
| subject | VARCHAR(100) | |
| teacher_id | UUID | FOREIGN KEY (users.id) |
| google_class_id | VARCHAR(255) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### students
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | |
| class_id | UUID | FOREIGN KEY (classes.id) |
| parent_email | VARCHAR(255) | |
| created_at | TIMESTAMP | DEFAULT NOW() |

### lessons
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| subject | VARCHAR(100) | NOT NULL |
| grade | INTEGER | |
| duration | INTEGER | (minutes) |
| author_id | UUID | FOREIGN KEY (users.id) |
| is_published | BOOLEAN | DEFAULT false |
| is_template | BOOLEAN | DEFAULT false |
| views | INTEGER | DEFAULT 0 |
| rating | DECIMAL(2,1) | DEFAULT 0.0 |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### lesson_blocks
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| lesson_id | UUID | FOREIGN KEY (lessons.id) |
| type_id | UUID | FOREIGN KEY (block_types.id) |
| content | JSONB | NOT NULL |
| position | INTEGER | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### block_types
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| icon | VARCHAR(50) | |
| schema | JSONB | (JSON Schema definition) |

### assignments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| class_id | UUID | FOREIGN KEY (classes.id) |
| lesson_id | UUID | FOREIGN KEY (lessons.id), NULL |
| due_date | TIMESTAMP | |
| type | ENUM('homework','test','quiz','project') | |
| max_score | INTEGER | DEFAULT 100 |
| auto_grade | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### submissions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| assignment_id | UUID | FOREIGN KEY (assignments.id) |
| student_id | UUID | FOREIGN KEY (students.id) |
| content | JSONB | |
| score | INTEGER | |
| graded_at | TIMESTAMP | |
| submitted_at | TIMESTAMP | |
| status | ENUM('pending','submitted','graded','late') | |
| feedback | TEXT | |

---

## Indexes

```sql
CREATE INDEX idx_lessons_subject ON lessons(subject);
CREATE INDEX idx_lessons_grade ON lessons(grade);
CREATE INDEX idx_lessons_author ON lessons(author_id);
CREATE INDEX idx_lessons_published ON lessons(is_published);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_students_class ON students(class_id);

CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_due ON assignments(due_date);

CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```
