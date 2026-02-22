"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { isFounder, type UserRole } from "@/lib/roles"

export async function loginAction(email: string, password: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return {
        success: false,
        error: error.message === "Invalid login credentials" ? "error_invalid_credentials" : "error_generic",
      }
    }
    revalidatePath("/", "layout")
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: "network_error" }
  }
}

export async function signUpAction(
  email: string,
  password: string,
  fullName: string,
  phone: string,
) {
  try {
    const supabase = await createClient()

    // Only founder email gets founder role, everyone else is participant
    const actualRole: UserRole = isFounder(email) ? "founder" : "participant"

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard`,
        data: {
          full_name: fullName,
          phone: phone,
          role: actualRole,
        },
      },
    })

    if (error) {
      return { success: false, error: error.message.includes("already registered") ? "error_email_exists" : "error_creating_account" }
    }

    revalidatePath("/", "layout")
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: "error_generic" }
  }
}
