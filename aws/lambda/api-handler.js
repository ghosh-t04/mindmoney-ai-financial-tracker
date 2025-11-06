const mysql = require('mysql2/promise');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const axios = require('axios');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
};

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.USER_POOL_CLIENT_ID,
});

// Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Helper function to create response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...headers },
  body: JSON.stringify(body)
});

// Helper function to verify JWT token
const verifyToken = async (event) => {
  try {
    console.log('🔍 Lambda Debug - Verifying token...');
    const headers = event.headers || {};
    console.log('📋 Request headers:', JSON.stringify(headers, null, 2));
    
    const authHeader = headers.Authorization || headers.authorization || headers.AUTHORIZATION;
    console.log('🔑 Auth header:', authHeader);
    
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    console.log('🎫 Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      console.log('❌ No token provided');
      throw new Error('No token provided');
    }
    
    console.log('🔍 Verifying token with Cognito...');
    const payload = await verifier.verify(token);
    console.log('✅ Token verified successfully:', payload);
    return payload;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    throw new Error('Invalid token');
  }
};

// Database helper functions
const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

const executeQuery = async (query, params = []) => {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } finally {
    await connection.end();
  }
};

// Gemini API helper
const callGemini = async (prompt, model = 'models/gemini-2.0-flash') => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    const candidates = response.data?.candidates || [];
    const text = candidates[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  } catch (error) {
    console.error('Gemini API error:', error?.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
};

// API Handlers
const handleQuizSubmit = async (event, userPayload) => {
  try {
    console.log('Quiz submit - event body:', event.body);
    const { answers } = JSON.parse(event.body);
    console.log('Quiz submit - answers:', answers);
    
    // Ensure user exists in database
    console.log('Quiz submit - ensuring user exists...');
    const userCheckQuery = 'SELECT * FROM users WHERE id = ?';
    const existingUser = await executeQuery(userCheckQuery, [userPayload.sub]);
    
    if (existingUser.length === 0) {
      console.log('Quiz submit - creating user record...');
      const createUserQuery = `
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      await executeQuery(createUserQuery, [
        userPayload.sub,
        userPayload.email || 'user@example.com',
        userPayload.name || 'User'
      ]);
      console.log('Quiz submit - user created');
    }
    
    // Generate analysis using Gemini
    const analysisPrompt = `
      Analyze the following spending habit quiz answers and provide a brief, personalized analysis (2-3 sentences):
      
      ${answers.map(a => `Question: ${a.questionId}, Answer: ${a.answer}`).join('\n')}
      
      Focus on spending patterns, potential areas for improvement, and positive habits. Be encouraging and actionable.
    `;
    
    console.log('Quiz submit - calling Gemini...');
    const analysis = await callGemini(analysisPrompt);
    console.log('Quiz submit - Gemini response:', analysis);
    
    // Save to database
    const query = `
      INSERT INTO quiz_responses (user_id, answers, analysis, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    
    console.log('Quiz submit - saving to database...');
    await executeQuery(query, [userPayload.sub, JSON.stringify(answers), analysis]);
    console.log('Quiz submit - saved to database');
    
    return createResponse(200, {
      success: true,
      data: {
        id: Date.now().toString(),
        userId: userPayload.sub,
        answers,
        analysis,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return createResponse(500, {
      success: false,
      error: error.message
    });
  }
};

const handleAddSpendingEntry = async (event, userPayload) => {
  const { date, amount, description, category, isNecessary } = JSON.parse(event.body);
  
  const query = `
    INSERT INTO spending_entries (user_id, date, amount, description, category, is_necessary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  
  await executeQuery(query, [userPayload.sub, date, amount, description, category, isNecessary]);
  
  return createResponse(200, {
    success: true,
    data: {
      id: Date.now().toString(),
      userId: userPayload.sub,
      date,
      amount,
      description,
      category,
      isNecessary,
      createdAt: new Date().toISOString()
    }
  });
};

const extractUserIdFromPath = (path, prefix) => {
  // prefix examples: '/spending/entries/', '/analysis/daily/', '/chat/history/'
  if (!path || !prefix) return null;
  const idx = path.indexOf(prefix);
  if (idx === -1) return null;
  let rest = path.slice(idx + prefix.length);
  // strip query string if present
  const qIdx = rest.indexOf('?');
  if (qIdx !== -1) rest = rest.slice(0, qIdx);
  // userId ends at next slash or end of string
  const endIdx = rest.indexOf('/');
  return endIdx === -1 ? rest : rest.slice(0, endIdx);
};

const handleGetSpendingEntries = async (event, userPayload) => {
  let userId = event.pathParameters?.userId;
  const date = event.queryStringParameters?.date;
  if (!userId) {
    userId = extractUserIdFromPath(event.path, '/spending/entries/');
  }
  // Authorize only if a userId is provided and it mismatches the token subject
  if (userId && userPayload && userId !== userPayload.sub) {
    return createResponse(403, { success: false, error: 'Unauthorized' });
  }
  try {
    const effectiveUserId = userId || (userPayload ? userPayload.sub : null);
    if (!effectiveUserId) {
      return createResponse(400, { success: false, error: 'Missing userId' });
    }
    let query = 'SELECT * FROM spending_entries WHERE user_id = ?';
    const params = [effectiveUserId];
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    query += ' ORDER BY created_at DESC';
    const entries = await executeQuery(query, params);
    return createResponse(200, { success: true, data: entries });
  } catch (err) {
    // DB likely not configured yet; return empty list as a safe fallback
    return createResponse(200, { success: true, data: [] });
  }
};

const handleSetSavingsGoal = async (event, userPayload) => {
  const { monthlyIncome, monthlySavingsGoal } = JSON.parse(event.body);
  
  // Generate savings plan using Ollama
  const planPrompt = `
    Create a personalized savings plan for someone with:
    - Monthly Income: $${monthlyIncome}
    - Monthly Savings Goal: $${monthlySavingsGoal}
    
    Provide 3-4 actionable recommendations for achieving this goal. Be specific and practical.
  `;
  
  const savingsPlan = await callGemini(planPrompt);
  try {
    const query = `
      INSERT INTO savings_goals (user_id, monthly_income, monthly_savings_goal, savings_plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      monthly_income = VALUES(monthly_income),
      monthly_savings_goal = VALUES(monthly_savings_goal),
      savings_plan = VALUES(savings_plan),
      updated_at = NOW()
    `;
    await executeQuery(query, [userPayload.sub, monthlyIncome, monthlySavingsGoal, savingsPlan]);
  } catch (err) {
    // Allow operation to succeed without DB persistence
  }
  return createResponse(200, { success: true, data: {
    id: Date.now().toString(),
    userId: userPayload.sub,
    monthlyIncome,
    monthlySavingsGoal,
    savingsPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }});
};

const handleGetDailyAnalysis = async (event, userPayload) => {
  let userId = event.pathParameters?.userId;
  const date = event.queryStringParameters?.date;
  if (!userId) {
    userId = extractUserIdFromPath(event.path, '/analysis/daily/');
  }
  
  if (userId !== userPayload.sub) {
    return createResponse(403, { success: false, error: 'Unauthorized' });
  }
  
  // Get spending entries for the date
  const entries = await executeQuery(
    'SELECT * FROM spending_entries WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  
  const totalSpent = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const necessarySpent = entries.filter(e => e.is_necessary).reduce((sum, entry) => sum + entry.amount, 0);
  const unnecessarySpent = totalSpent - necessarySpent;
  
  // Get savings goal
  const [savingsGoal] = await executeQuery(
    'SELECT * FROM savings_goals WHERE user_id = ?',
    [userId]
  );
  
  // Generate analysis using Ollama
  const analysisPrompt = `
    Analyze today's spending for a user:
    - Total spent: $${totalSpent}
    - Necessary expenses: $${necessarySpent}
    - Unnecessary expenses: $${unnecessarySpent}
    - Monthly savings goal: $${savingsGoal?.monthly_savings_goal || 0}
    - Monthly income: $${savingsGoal?.monthly_income || 0}
    
    Provide a brief analysis (2-3 sentences) and 2-3 specific recommendations. Be encouraging but honest.
  `;
  
  const analysis = await callGemini(analysisPrompt);
  
  // Simple on-track calculation (spending less than 80% of daily budget)
  const dailyBudget = savingsGoal ? (savingsGoal.monthly_income - savingsGoal.monthly_savings_goal) / 30 : 0;
  const onTrack = totalSpent <= dailyBudget * 0.8;
  
  return createResponse(200, {
    success: true,
    data: {
      date,
      totalSpent,
      necessarySpent,
      unnecessarySpent,
      onTrack,
      analysis,
      recommendations: [
        onTrack ? "Great job staying within budget!" : "Consider reducing unnecessary expenses",
        "Track your spending daily to stay on top of your goals",
        "Review your budget weekly to make adjustments"
      ]
    }
  });
};

const handleChatMessage = async (event, userPayload) => {
  const { message } = JSON.parse(event.body);
  
  // Get user context
  const [savingsGoal] = await executeQuery(
    'SELECT * FROM savings_goals WHERE user_id = ?',
    [userPayload.sub]
  );
  
  const recentEntries = await executeQuery(
    'SELECT * FROM spending_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
    [userPayload.sub]
  );
  
  const contextPrompt = `
    You are a helpful financial advisor. The user is asking: "${message}"
    
    User context:
    - Monthly income: $${savingsGoal?.monthly_income || 0}
    - Monthly savings goal: $${savingsGoal?.monthly_savings_goal || 0}
    - Recent spending: ${recentEntries.map(e => `${e.description}: $${e.amount}`).join(', ')}
    
    Provide helpful, personalized financial advice. Be encouraging and practical. Keep response under 200 words.
  `;
  
  const response = await callGemini(contextPrompt);
  
  // Save chat message
  await executeQuery(
    'INSERT INTO chat_messages (user_id, message, is_user, timestamp) VALUES (?, ?, ?, NOW())',
    [userPayload.sub, message, true]
  );
  
  await executeQuery(
    'INSERT INTO chat_messages (user_id, message, is_user, timestamp) VALUES (?, ?, ?, NOW())',
    [userPayload.sub, response, false]
  );
  
  return createResponse(200, {
    success: true,
    data: {
      id: Date.now().toString(),
      userId: userPayload.sub,
      message: response,
      isUser: false,
      timestamp: new Date().toISOString()
    }
  });
};

const handleGetQuizAnalysis = async (event, userPayload) => {
  const userId = event.pathParameters?.userId;
  
  if (userId !== userPayload.sub) {
    return createResponse(403, { success: false, error: 'Unauthorized' });
  }
  
  const [quizResponse] = await executeQuery(
    'SELECT * FROM quiz_responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  
  if (!quizResponse) {
    return createResponse(404, { success: false, error: 'Quiz not found' });
  }
  
  return createResponse(200, {
    success: true,
    data: {
      id: quizResponse.id.toString(),
      userId: quizResponse.user_id,
      answers: JSON.parse(quizResponse.answers),
      analysis: quizResponse.analysis,
      createdAt: quizResponse.created_at.toISOString()
    }
  });
};

const handleGetSavingsGoal = async (event, userPayload) => {
  const userId = event.pathParameters?.userId;
  
  if (userId !== userPayload.sub) {
    return createResponse(403, { success: false, error: 'Unauthorized' });
  }
  
  const [savingsGoal] = await executeQuery(
    'SELECT * FROM savings_goals WHERE user_id = ?',
    [userId]
  );
  
  if (!savingsGoal) {
    return createResponse(404, { success: false, error: 'Savings goal not found' });
  }
  
  return createResponse(200, {
    success: true,
    data: {
      id: savingsGoal.id.toString(),
      userId: savingsGoal.user_id,
      monthlyIncome: parseFloat(savingsGoal.monthly_income),
      monthlySavingsGoal: parseFloat(savingsGoal.monthly_savings_goal),
      savingsPlan: savingsGoal.savings_plan,
      createdAt: savingsGoal.created_at.toISOString(),
      updatedAt: savingsGoal.updated_at.toISOString()
    }
  });
};

const handleUpdateSpendingEntry = async (event, userPayload) => {
  const entryId = event.pathParameters?.id;
  const { date, amount, description, category, isNecessary } = JSON.parse(event.body);
  
  // Verify ownership
  const [existingEntry] = await executeQuery(
    'SELECT * FROM spending_entries WHERE id = ? AND user_id = ?',
    [entryId, userPayload.sub]
  );
  
  if (!existingEntry) {
    return createResponse(404, { success: false, error: 'Entry not found' });
  }
  
  const query = `
    UPDATE spending_entries 
    SET date = ?, amount = ?, description = ?, category = ?, is_necessary = ?
    WHERE id = ? AND user_id = ?
  `;
  
  await executeQuery(query, [date, amount, description, category, isNecessary, entryId, userPayload.sub]);
  
  return createResponse(200, {
    success: true,
    data: {
      id: entryId,
      userId: userPayload.sub,
      date,
      amount,
      description,
      category,
      isNecessary,
      createdAt: existingEntry.created_at.toISOString()
    }
  });
};

const handleDeleteSpendingEntry = async (event, userPayload) => {
  const entryId = event.pathParameters?.id;
  
  // Verify ownership
  const [existingEntry] = await executeQuery(
    'SELECT * FROM spending_entries WHERE id = ? AND user_id = ?',
    [entryId, userPayload.sub]
  );
  
  if (!existingEntry) {
    return createResponse(404, { success: false, error: 'Entry not found' });
  }
  
  await executeQuery(
    'DELETE FROM spending_entries WHERE id = ? AND user_id = ?',
    [entryId, userPayload.sub]
  );
  
  return createResponse(200, {
    success: true,
    data: null
  });
};

const handleGetChatHistory = async (event, userPayload) => {
  let userId = event.pathParameters?.userId;
  if (!userId) {
    userId = extractUserIdFromPath(event.path, '/chat/history/');
  }
  
  if (userId !== userPayload.sub) {
    return createResponse(403, { success: false, error: 'Unauthorized' });
  }
  
  const messages = await executeQuery(
    'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50',
    [userId]
  );
  
  return createResponse(200, {
    success: true,
    data: messages.map(msg => ({
      id: msg.id.toString(),
      userId: msg.user_id,
      message: msg.message,
      isUser: msg.is_user === 1,
      timestamp: msg.timestamp.toISOString()
    }))
  });
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }
  
  try {
    const { httpMethod, path, pathParameters, resource } = event;
    
    // For API Gateway proxy integration, use the path first, then resource
    const actualPath = path || resource;
    
    // Remove stage name from path if present (e.g., /dev/health -> /health)
    // Also handle proxy path parameters
    let cleanPath = actualPath;
    if (pathParameters && pathParameters.proxy) {
      cleanPath = '/' + pathParameters.proxy;
    } else if (actualPath.startsWith('/dev/')) {
      cleanPath = actualPath.replace('/dev', '');
    }
    cleanPath = cleanPath || '/';
    
    // Debug logging
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Original path:', path);
    console.log('Resource:', resource);
    console.log('Actual path:', actualPath);
    console.log('Clean path:', cleanPath);
    console.log('HTTP method:', httpMethod);
    
    // Verify JWT token for all requests except health check, test-db, test-gemini, test-schema, and debug
    let userPayload = null;
    if (cleanPath !== '/health' && cleanPath !== '/test-db' && cleanPath !== '/test-gemini' && cleanPath !== '/test-schema' && cleanPath !== '/debug') {
      userPayload = await verifyToken(event);
    }
    
    // Route requests
    if (cleanPath === '/health') {
      return createResponse(200, { status: 'healthy' });
    }
    
    if (cleanPath === '/test-db') {
      try {
        console.log('Testing database connection...');
        const connection = await getConnection();
        console.log('Database connected successfully');
        await connection.end();
        return createResponse(200, { status: 'database connected' });
      } catch (error) {
        console.error('Database connection failed:', error);
        return createResponse(500, { error: error.message });
      }
    }
    
    if (cleanPath === '/test-gemini') {
      try {
        console.log('Testing Gemini API...');
        const response = await callGemini('Hello, this is a test. Please respond with "Test successful"');
        console.log('Gemini response:', response);
        return createResponse(200, { status: 'gemini working', response });
      } catch (error) {
        console.error('Gemini API failed:', error);
        return createResponse(500, { error: error.message });
      }
    }
    
    if (cleanPath === '/debug') {
      return createResponse(200, { 
        message: 'Debug endpoint working',
        path: cleanPath,
        originalPath: path,
        actualPath: actualPath
      });
    }
    
    if (cleanPath === '/test-schema') {
      try {
        console.log('Testing database schema...');
        const tables = await executeQuery('SHOW TABLES');
        console.log('Tables:', tables);
        
        // Check quiz_responses table structure
        const quizTableStructure = await executeQuery('DESCRIBE quiz_responses');
        console.log('Quiz responses table structure:', quizTableStructure);
        
        // Check users table structure
        const usersTableStructure = await executeQuery('DESCRIBE users');
        console.log('Users table structure:', usersTableStructure);
        
        // Check if user exists
        const testUserId = '41d30dea-2041-707f-953d-b18011ab9d80';
        const userExists = await executeQuery('SELECT * FROM users WHERE id = ?', [testUserId]);
        console.log('User exists check:', userExists);
        
        return createResponse(200, { status: 'schema check', tables, quizTableStructure, usersTableStructure, userExists });
      } catch (error) {
        console.error('Schema check failed:', error);
        return createResponse(500, { error: error.message });
      }
    }
    
    if (httpMethod === 'POST' && cleanPath === '/quiz/submit') {
      return await handleQuizSubmit(event, userPayload);
    }
    
    if (httpMethod === 'POST' && cleanPath === '/spending/entry') {
      return await handleAddSpendingEntry(event, userPayload);
    }
    
    if (httpMethod === 'GET' && cleanPath.startsWith('/spending/entries/')) {
      return await handleGetSpendingEntries(event, userPayload);
    }
    
    if (httpMethod === 'POST' && cleanPath === '/savings/goal') {
      return await handleSetSavingsGoal(event, userPayload);
    }
    
    if (httpMethod === 'GET' && cleanPath.startsWith('/analysis/daily/')) {
      return await handleGetDailyAnalysis(event, userPayload);
    }
    
    if (httpMethod === 'POST' && cleanPath === '/chat/message') {
      return await handleChatMessage(event, userPayload);
    }
    
    if (httpMethod === 'GET' && cleanPath.startsWith('/quiz/analysis/')) {
      return await handleGetQuizAnalysis(event, userPayload);
    }
    
    if (httpMethod === 'GET' && cleanPath.startsWith('/savings/goal/')) {
      return await handleGetSavingsGoal(event, userPayload);
    }
    
    if (httpMethod === 'PUT' && cleanPath.startsWith('/spending/entry/')) {
      return await handleUpdateSpendingEntry(event, userPayload);
    }
    
    if (httpMethod === 'DELETE' && cleanPath.startsWith('/spending/entry/')) {
      return await handleDeleteSpendingEntry(event, userPayload);
    }
    
    if (httpMethod === 'GET' && cleanPath.startsWith('/chat/history/')) {
      return await handleGetChatHistory(event, userPayload);
    }
    
    return createResponse(404, { success: false, error: 'Not found' });
    
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
