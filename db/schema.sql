-- TABLE USERS
-- Change as needed ---
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role, type)
VALUES (
    'admin',
    '$2a$10$W/95zS9FrSgp3weyJopTDe6F/5YLwtoZ0VaVcAtZLdQ9MtyNG9Nry',
    'System Administrator',
    'admin',
    'admin'
);

CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title text,
  category text,
  note_date VARCHAR(50),
  attachment_url text,
  created_at TIMESTAMP DEFAULT NOW(),
  content text
)