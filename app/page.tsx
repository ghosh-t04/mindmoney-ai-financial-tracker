'use client'

import { Authenticator } from '@aws-amplify/ui-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Authenticator
        hideSignUp={false}
        signUpAttributes={['email', 'name']}
        formFields={{
          signUp: {
            email: {
              order: 1,
              isRequired: true,
            },
            name: {
              order: 2,
              isRequired: true,
            },
            password: {
              order: 3,
              isRequired: true,
            },
            confirm_password: {
              order: 4,
              isRequired: true,
            },
          },
        }}
      >
        {({ signOut, user }) => (
          <div className="min-h-screen">
            <Dashboard user={user} onSignOut={signOut} />
          </div>
        )}
      </Authenticator>
    </main>
  )
}
