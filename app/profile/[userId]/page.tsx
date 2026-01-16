import { Suspense } from "react"
import { UserProfileView } from "@/components/user-profile-view"

export default function ProfilePage({ params }: { params: { userId: string } }) {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <UserProfileView userId={params.userId} />
        </Suspense>
      </div>
    </div>
  )
}
