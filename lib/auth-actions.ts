"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { validateVerificationCode, isFounder, type UserRole } from "@/lib/roles"

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
  role: string,
  verificationCode: string,
) {
  try {
    const supabase = await createClient()
    let actualRole: UserRole = role as UserRole
    let schoolId: number | null = null
    let secretaryType: "general" | "deputy" | null = null

    // Improved Founder/Role Logic
    if (isFounder(email)) {
      actualRole = "founder"
    } else if (["admin", "general_secretary", "deputy"].includes(role)) {
      const validation = validateVerificationCode(verificationCode)
      // Check if code is valid AND corresponds to the selected role
      if (!validation.valid || validation.role !== role) {
        return { success: false, error: "invalid_verification_code" }
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
          phone: phone,
          role: actualRole,
          school_id: schoolId,
          secretary_type: secretaryType,
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
