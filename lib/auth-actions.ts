"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { validateVerificationCode, isFounder, type UserRole } from "@/lib/roles"

export async function loginAction(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: error.message === "Invalid login credentials" ? "error_invalid_credentials" : "error_generic",
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: "error_invalid_credentials",
      }
    }

    revalidatePath("/", "layout")
    return { success: true, user: data.user }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes("JSON") || errorMsg.includes("Invalid") || errorMsg.includes("fetch")) {
      return {
        success: false,
        error: "network_error",
      }
    }
    return {
      success: false,
      error: "error_generic",
    }
  }
}

export async function signUpAction(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: "participant" | "admin" | "general_secretary" | "deputy" | "founder",
  verificationCode: string,
) {
  try {
    const supabase = await createClient()

    let actualRole: UserRole = role as UserRole
    let schoolId: number | null = null
    let secretaryType: "general" | "deputy" | null = null

    // Founder verification
    if (isFounder(email)) {
      actualRole = "founder"
    } else if (["admin", "general_secretary", "deputy"].includes(role)) {
      const validation = validateVerificationCode(verificationCode)
      if (!validation.valid) {
        return {
          success: false,
          error: "invalid_verification_code",
        }
      }
      actualRole = validation.role!
      schoolId = validation.schoolId || null
      secretaryType = validation.secretaryType || null
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard`,
        data: {
          full_name: fullName,
          phone: phone || null,
          role: actualRole,
          school_id: schoolId,
          secretary_type: secretaryType,
        },
      },
    })

    if (error) {
      if (error.message.includes("already registered")) {
        return {
          success: false,
          error: "error_email_exists",
        }
      }

      return {
        success: false,
        error: "error_creating_account",
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: "error_creating_account",
      }
    }

    revalidatePath("/", "layout")
    return { success: true, user: data.user }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes("JSON") || errorMsg.includes("Invalid") || errorMsg.includes("fetch")) {
      return {
        success: false,
        error: "network_error",
      }
    }
    return {
      success: false,
      error: "error_generic",
    }
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    }
  }
}
