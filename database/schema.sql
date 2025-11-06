-- MindMoney Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS mindmoney;
USE mindmoney;

-- Users table (managed by Cognito, but we might need to sync)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quiz responses table
CREATE TABLE IF NOT EXISTS quiz_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    answers JSON NOT NULL,
    analysis TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Spending entries table
CREATE TABLE IF NOT EXISTS spending_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_necessary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date),
    INDEX idx_category (category)
);

-- Savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    monthly_income DECIMAL(10,2) NOT NULL,
    monthly_savings_goal DECIMAL(10,2) NOT NULL,
    savings_plan TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_user BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);

-- Daily analysis cache table
CREATE TABLE IF NOT EXISTS daily_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_spent DECIMAL(10,2) NOT NULL,
    necessary_spent DECIMAL(10,2) NOT NULL,
    unnecessary_spent DECIMAL(10,2) NOT NULL,
    on_track BOOLEAN NOT NULL,
    analysis TEXT NOT NULL,
    recommendations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
);

-- Financial insights table (for storing AI-generated insights)
CREATE TABLE IF NOT EXISTS financial_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    insight_type ENUM('spending_pattern', 'savings_opportunity', 'budget_alert', 'goal_progress') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actionable_items JSON,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_insight_type (insight_type),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- Budget categories table (for predefined categories)
CREATE TABLE IF NOT EXISTS budget_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_necessary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default budget categories
INSERT INTO budget_categories (name, description, is_necessary) VALUES
('Food & Dining', 'Groceries, restaurants, food delivery', TRUE),
('Transportation', 'Gas, public transport, car maintenance', TRUE),
('Entertainment', 'Movies, games, subscriptions, hobbies', FALSE),
('Shopping', 'Clothing, electronics, personal items', FALSE),
('Bills & Utilities', 'Rent, electricity, water, internet', TRUE),
('Healthcare', 'Medical expenses, insurance, pharmacy', TRUE),
('Education', 'Books, courses, school supplies', TRUE),
('Other', 'Miscellaneous expenses', FALSE)
ON DUPLICATE KEY UPDATE name = name;

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    daily_reminder_time TIME DEFAULT '20:00:00',
    weekly_report_day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') DEFAULT 'sunday',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Create views for common queries
CREATE VIEW user_spending_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(se.id) as total_entries,
    COALESCE(SUM(se.amount), 0) as total_spent,
    COALESCE(SUM(CASE WHEN se.is_necessary = TRUE THEN se.amount ELSE 0 END), 0) as necessary_spent,
    COALESCE(SUM(CASE WHEN se.is_necessary = FALSE THEN se.amount ELSE 0 END), 0) as unnecessary_spent,
    COALESCE(AVG(se.amount), 0) as avg_entry_amount,
    MAX(se.created_at) as last_entry_date
FROM users u
LEFT JOIN spending_entries se ON u.id = se.user_id
GROUP BY u.id, u.name, u.email;

CREATE VIEW monthly_spending_trends AS
SELECT 
    user_id,
    YEAR(date) as year,
    MONTH(date) as month,
    SUM(amount) as total_spent,
    SUM(CASE WHEN is_necessary = TRUE THEN amount ELSE 0 END) as necessary_spent,
    SUM(CASE WHEN is_necessary = FALSE THEN amount ELSE 0 END) as unnecessary_spent,
    COUNT(*) as entry_count
FROM spending_entries
GROUP BY user_id, YEAR(date), MONTH(date)
ORDER BY user_id, year DESC, month DESC;

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetUserDashboardData(IN p_user_id VARCHAR(255))
BEGIN
    -- Get user info
    SELECT * FROM users WHERE id = p_user_id;
    
    -- Get recent spending entries (last 7 days)
    SELECT * FROM spending_entries 
    WHERE user_id = p_user_id 
    AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ORDER BY date DESC, created_at DESC;
    
    -- Get savings goal
    SELECT * FROM savings_goals WHERE user_id = p_user_id;
    
    -- Get recent chat messages (last 10)
    SELECT * FROM chat_messages 
    WHERE user_id = p_user_id 
    ORDER BY timestamp DESC 
    LIMIT 10;
    
    -- Get unread insights
    SELECT * FROM financial_insights 
    WHERE user_id = p_user_id 
    AND is_read = FALSE 
    ORDER BY priority DESC, created_at DESC;
END //

CREATE PROCEDURE GenerateDailyAnalysis(IN p_user_id VARCHAR(255), IN p_date DATE)
BEGIN
    DECLARE v_total_spent DECIMAL(10,2) DEFAULT 0;
    DECLARE v_necessary_spent DECIMAL(10,2) DEFAULT 0;
    DECLARE v_unnecessary_spent DECIMAL(10,2) DEFAULT 0;
    DECLARE v_monthly_income DECIMAL(10,2) DEFAULT 0;
    DECLARE v_monthly_savings_goal DECIMAL(10,2) DEFAULT 0;
    DECLARE v_daily_budget DECIMAL(10,2) DEFAULT 0;
    DECLARE v_on_track BOOLEAN DEFAULT TRUE;
    
    -- Calculate spending for the day
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN is_necessary = TRUE THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN is_necessary = FALSE THEN amount ELSE 0 END), 0)
    INTO v_total_spent, v_necessary_spent, v_unnecessary_spent
    FROM spending_entries 
    WHERE user_id = p_user_id AND date = p_date;
    
    -- Get user's financial goals
    SELECT monthly_income, monthly_savings_goal
    INTO v_monthly_income, v_monthly_savings_goal
    FROM savings_goals 
    WHERE user_id = p_user_id;
    
    -- Calculate daily budget (80% of available income)
    IF v_monthly_income > 0 THEN
        SET v_daily_budget = (v_monthly_income - v_monthly_savings_goal) / 30 * 0.8;
        SET v_on_track = v_total_spent <= v_daily_budget;
    END IF;
    
    -- Insert or update daily analysis
    INSERT INTO daily_analysis (
        user_id, date, total_spent, necessary_spent, unnecessary_spent, 
        on_track, analysis, recommendations
    ) VALUES (
        p_user_id, p_date, v_total_spent, v_necessary_spent, v_unnecessary_spent,
        v_on_track, 
        CONCAT('Daily spending: $', v_total_spent, '. ', 
               CASE WHEN v_on_track THEN 'On track with budget goals.' 
                    ELSE 'Consider reducing expenses to meet savings goals.' END),
        JSON_ARRAY(
            CASE WHEN v_on_track THEN 'Great job staying within budget!' 
                 ELSE 'Review unnecessary expenses' END,
            'Track spending daily for better control',
            'Set weekly spending limits'
        )
    ) ON DUPLICATE KEY UPDATE
        total_spent = v_total_spent,
        necessary_spent = v_necessary_spent,
        unnecessary_spent = v_unnecessary_spent,
        on_track = v_on_track,
        analysis = CONCAT('Daily spending: $', v_total_spent, '. ', 
                         CASE WHEN v_on_track THEN 'On track with budget goals.' 
                              ELSE 'Consider reducing expenses to meet savings goals.' END),
        recommendations = JSON_ARRAY(
            CASE WHEN v_on_track THEN 'Great job staying within budget!' 
                 ELSE 'Review unnecessary expenses' END,
            'Track spending daily for better control',
            'Set weekly spending limits'
        );
    
    -- Return the analysis
    SELECT * FROM daily_analysis WHERE user_id = p_user_id AND date = p_date;
END //

DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_spending_user_date_category ON spending_entries(user_id, date, category);
CREATE INDEX idx_chat_user_timestamp ON chat_messages(user_id, timestamp);
CREATE INDEX idx_insights_user_priority ON financial_insights(user_id, priority, is_read);

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mindmoney.* TO 'mindmoney_user'@'%';
-- FLUSH PRIVILEGES;
