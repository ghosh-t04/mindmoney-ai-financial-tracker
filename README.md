# MindMoney - AI-Powered Finance Tracker

A comprehensive, modern finance tracking application powered by AI and built with Next.js, AWS services, and Ollama LLM integration.

##  Features

- **User Authentication**: Secure signup/login with AWS Cognito
- **AI-Powered Quiz**: Multiple-choice quiz to analyze spending habits
- **Daily Journal Tracker**: Track daily expenditures with necessity categorization
- **Personalized Savings Plans**: AI-generated savings recommendations
- **Real-time Analysis**: Daily spending analysis with goal tracking
- **AI Chat Interface**: Interactive financial advisor powered by Ollama
- **Responsive Design**: Modern, mobile-friendly interface
- **AWS Integration**: Complete cloud infrastructure

##  Architecture

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **AWS Amplify** for authentication
- **Framer Motion** for animations

### Backend
- **AWS Lambda** for serverless API
- **AWS API Gateway** for REST endpoints
- **AWS RDS MySQL** for data persistence
- **AWS Cognito** for user management
- **AWS S3** for static assets
- **AWS CloudFront** for CDN

### AI Integration
- **Ollama** hosted on AWS ECS Fargate
- **LLaMA 2** model for financial analysis
- Real-time chat and insights generation

##  Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- Docker (for local Ollama development)
- Git

##  Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mindmoney
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Deploy AWS Infrastructure

#### For Windows (PowerShell):
```powershell
.\scripts\deploy.ps1 -Environment dev -Region us-east-1
```

#### For Linux/Mac:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev us-east-1
```

### 4. Initialize Database
After deployment, run the database schema:
```sql
-- Connect to your RDS instance and run:
-- database/schema.sql
```

### 5. Set Up Ollama (Local Development)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull LLaMA 2 model
ollama pull llama2

# Start Ollama server
ollama serve
```

### 6. Environment Configuration
The deployment script creates `.env.local` with the necessary AWS configuration.

### 7. Run Development Server
```bash
npm run dev
```

##  AWS Services Used

| Service | Purpose |
|---------|---------|
| **Cognito** | User authentication and management |
| **RDS MySQL** | Database for user data and transactions |
| **Lambda** | Serverless API backend |
| **API Gateway** | REST API endpoints |
| **ECS Fargate** | Container hosting for Ollama |
| **S3** | Static website hosting |
| **CloudFront** | CDN and global distribution |
| **VPC** | Network isolation and security |
| **IAM** | Access control and permissions |

##  Project Structure

```
mindmoney/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── QuizComponent.tsx  # Spending habits quiz
│   ├── JournalTracker.tsx # Daily expense tracker
│   ├── ChatInterface.tsx  # AI chat interface
│   └── ...
├── lib/                   # Utility libraries
│   ├── amplify-config.tsx # AWS Amplify configuration
│   └── api.ts            # API client
├── types/                 # TypeScript type definitions
├── aws/                   # AWS infrastructure
│   ├── infrastructure/    # CloudFormation templates
│   └── lambda/           # Lambda function code
├── database/             # Database schema and migrations
├── scripts/              # Deployment scripts
└── public/               # Static assets
```

##  Configuration

### Environment Variables
```env
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID=your-identity-pool-id

# API Configuration
NEXT_PUBLIC_API_GATEWAY_URL=your-api-gateway-url
NEXT_PUBLIC_OLLAMA_API_URL=your-ollama-endpoint
```

### AWS Permissions
The deployment requires the following AWS permissions:
- CloudFormation (full access)
- IAM (create roles and policies)
- VPC (create networking resources)
- RDS (create database)
- Lambda (create and update functions)
- API Gateway (create and manage APIs)
- Cognito (create user pools)
- ECS (create cluster and services)
- S3 (create buckets and manage objects)
- CloudFront (create distributions)

##  Deployment

### Development Environment
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### AWS Deployment
```bash
# Deploy to development
.\scripts\deploy.ps1 -Environment dev

# Deploy to production
.\scripts\deploy.ps1 -Environment prod
```

##  Database Schema

The application uses MySQL with the following main tables:
- `users` - User information
- `quiz_responses` - Spending habits quiz data
- `spending_entries` - Daily expense records
- `savings_goals` - User financial goals
- `chat_messages` - AI chat history
- `daily_analysis` - AI-generated insights

##  AI Features

### Quiz Analysis
- Analyzes user spending habits from quiz responses
- Provides personalized insights and recommendations

### Savings Plan Generation
- Creates customized savings plans based on income and goals
- Considers spending history for realistic recommendations

### Daily Analysis
- Tracks daily spending against goals
- Provides real-time feedback and suggestions

### Chat Interface
- Interactive financial advisor
- Context-aware responses based on user data
- Personalized financial advice

##  Security

- JWT-based authentication with AWS Cognito
- VPC isolation for backend services
- Encrypted database connections
- CORS configuration for API endpoints
- Input validation and sanitization

##  Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Progressive Web App (PWA) capabilities

##  Testing

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run tests (when implemented)
npm test
```

##  Performance

- Server-side rendering with Next.js
- Image optimization
- Code splitting and lazy loading
- CDN distribution with CloudFront
- Database query optimization

##  Monitoring

Recommended monitoring setup:
- CloudWatch for AWS services
- Application performance monitoring
- Error tracking and logging
- User analytics

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

##  Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review AWS service documentation

##  Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Investment tracking
- [ ] Bill reminders and automation
- [ ] Multi-currency support
- [ ] Family/shared budgets
- [ ] Integration with banks and financial institutions
- [ ] Advanced AI models and features

---

Built with ❤️ using Next.js, AWS, and AI technology.
