'use client'

import { signIn } from 'next-auth/react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage(): React.ReactElement {
  function handleSignIn(): void {
    void signIn('authentik', { callbackUrl: '/' })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4 text-center">
        {/* UniLink Logo */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl font-bold">
          UL
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-2xl font-bold">
            UniLink Node Portal
          </CardTitle>
          <CardDescription className="text-base">
            Admin Portal สำหรับ Staff มหาวิทยาลัย
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSignIn}
        >
          <LogIn className="mr-2 h-5 w-5" />
          เข้าสู่ระบบด้วย Authentik
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          &copy; 2569 UniLink — Digital Credit Transfer Network
        </p>
      </CardContent>
    </Card>
  )
}
