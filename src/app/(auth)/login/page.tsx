"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import * as z from "zod"
import Link from "next/link"
import { toast } from "sonner" // Import toast

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// Remove Alert and AlertDescription imports as they are no longer used
// import { Alert, AlertDescription } from "@/components/ui/alert" 
import {LucideLoader2 } from "lucide-react"

// Schema für das Login Formular
const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  // Remove error state
  // const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginValues) {
    try {
      setIsLoading(true)
      // setError(null) // Remove setError call
      
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Ungültige E-Mail oder Passwort.") // Use toast.error
        return
      }

      router.push("/") // Weiterleitung zur Startseite nach erfolgreicher Anmeldung
      router.refresh() // Aktualisieren der Seite, um die Sitzung zu reflektieren
    } catch (error) {
      console.error("Login submission error:", error);
      toast.error("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.") // Use toast.error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Anmelden</CardTitle>
        <CardDescription className="text-center">
          Melden Sie sich an, um fortzufahren
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Remove Alert component */}
        {/* {error && (
          <Alert variant="destructive" className="mb-6">
            <LucideAlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )} */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="ihre.email@beispiel.de" 
                        autoComplete="email"
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passwort</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        autoComplete="current-password"
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : "Anmelden"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link 
            href="/register" 
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Registrieren
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}