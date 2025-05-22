"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2 } from "lucide-react"


// 
/**
 * 
 * ## How It Works

This demo showcases the Sonner toast component from shadcn/ui with various configurations:

1. **Setup**: The `Toaster` component is added to the root layout to make toasts available throughout the application .
2. **Toast Types**:

1. Default toast
2. Success toast
3. Error toast
4. Info toast
5. Warning toast
6. Custom toast with actions



3. **Advanced Features**:

1. Promise-based toasts that show loading, success, and error states
2. Updating existing toasts
3. Controlling toast position and duration





## Key Components

- **Toaster**: The main component that renders the toast notifications
- **toast function**: Used to trigger different types of toasts with various configurations


## Usage

To use the toast functionality in your components:

```typescriptreact
import { toast } from "sonner"

// Basic toast
toast("Hello world!")

// Success toast
toast.success("Operation completed successfully")

// Error toast
toast.error("Something went wrong")

// Promise toast
toast.promise(fetchData(), {
  loading: "Loading...",
  success: "Data loaded successfully",
  error: "Failed to load data"
})
```

You can customize the appearance, position, duration, and add actions to your toasts as shown in the demo.
 */

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)

  const simulatePromise = (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)

    return new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false)
        resolve({ success: true, message: "Data successfully loaded!" })
      }, 2000)
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Sonner Toast Demo</h1>
          <p className="text-muted-foreground">Click the buttons below to see different types of toasts in action.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button onClick={() => toast("Default toast notification")} className="w-full">
            Default Toast
          </Button>

          <Button
            onClick={() =>
              toast.success("Success toast notification", {
                description: "Your action was completed successfully.",
              })
            }
            variant="outline"
            className="w-full"
          >
            Success Toast
          </Button>

          <Button
            onClick={() =>
              toast.error("Error toast notification", {
                description: "There was an error processing your request.",
              })
            }
            variant="destructive"
            className="w-full"
          >
            Error Toast
          </Button>

          <Button
            onClick={() =>
              toast.info("Info toast notification", {
                description: "Here's some information you might find useful.",
              })
            }
            variant="secondary"
            className="w-full"
          >
            Info Toast
          </Button>

          <Button
            onClick={() =>
              toast.warning("Warning toast notification", {
                description: "Please be careful with this action.",
              })
            }
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            Warning Toast
          </Button>

          <Button
            onClick={() =>
              toast("Custom toast", {
                icon: "🚀",
                description: "This toast has a custom icon and actions.",
                action: {
                  label: "Undo",
                  onClick: () => toast.info("Undo action triggered"),
                },
                cancel: {
                  label: "Cancel",
                  onClick: () => toast.error("Action cancelled"),
                },
              })
            }
            variant="outline"
            className="w-full"
          >
            Custom Toast
          </Button>

          <Button
            onClick={() => {
              toast.promise(simulatePromise, {
                loading: "Loading data...",
                success: (data: { success: boolean; message: string }) => {
                  return data.message
                },
                error: "Failed to load data",
              })
            }}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Promise Toast"
            )}
          </Button>

          <Button
            onClick={() => {
              const toastId = toast.loading("Loading...", {
                description: "Please wait while we process your request",
              })

              setTimeout(() => {
                toast.success("Completed!", {
                  id: toastId,
                  description: "Your request has been processed successfully",
                })
              }, 2000)
            }}
            variant="secondary"
            className="w-full"
          >
            Update Toast
          </Button>

          <Button
            onClick={() => {
              toast("Multiple lines", {
                description: "This toast has a title and a longer description that spans multiple lines.",
                duration: 5000,
              })
            }}
            variant="outline"
            className="w-full"
          >
            Multi-line Toast
          </Button>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Position & Duration</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <Button
              onClick={() => {
                toast("Top Right Toast", { position: "top-right" })
              }}
              variant="outline"
              size="sm"
            >
              Top Right
            </Button>
            <Button
              onClick={() => {
                toast("Top Center Toast", { position: "top-center" })
              }}
              variant="outline"
              size="sm"
            >
              Top Center
            </Button>
            <Button
              onClick={() => {
                toast("Bottom Right Toast", { position: "bottom-right" })
              }}
              variant="outline"
              size="sm"
            >
              Bottom Right
            </Button>
            <Button
              onClick={() => {
                toast("Long Duration Toast", {
                  duration: 10000,
                  description: "This toast will stay visible for 10 seconds.",
                })
              }}
              variant="outline"
              size="sm"
            >
              Long Duration (10s)
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

