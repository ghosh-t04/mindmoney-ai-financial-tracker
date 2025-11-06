'use client'

import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID!,
      identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID!,
    }
  },
  API: {
    REST: {
      MindMoneyAPI: {
        endpoint: process.env.NEXT_PUBLIC_API_GATEWAY_URL!,
        region: process.env.NEXT_PUBLIC_AWS_REGION!,
      }
    }
  }
})

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Authenticator.Provider>
      {children}
    </Authenticator.Provider>
  )
}
